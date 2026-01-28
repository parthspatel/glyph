# Glyph Development Environment

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }

  backend "azurerm" {
    resource_group_name  = "glyph-tfstate"
    storage_account_name = "glyphtfstate"
    container_name       = "tfstate"
    key                  = "dev.terraform.tfstate"
  }
}

provider "azurerm" {
  features {}
}

locals {
  environment = "dev"
  location    = "eastus"
  tags = {
    Environment = local.environment
    Project     = "glyph"
    ManagedBy   = "terraform"
  }
}

resource "azurerm_resource_group" "main" {
  name     = "glyph-${local.environment}"
  location = local.location
  tags     = local.tags
}

# Networking
resource "azurerm_virtual_network" "main" {
  name                = "glyph-${local.environment}-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = local.location
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.tags
}

resource "azurerm_subnet" "aks" {
  name                 = "aks-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}

resource "azurerm_subnet" "db" {
  name                 = "db-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.2.0/24"]

  delegation {
    name = "postgresql"
    service_delegation {
      name = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action"
      ]
    }
  }
}

# Log Analytics
resource "azurerm_log_analytics_workspace" "main" {
  name                = "glyph-${local.environment}-logs"
  location            = local.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.tags
}

# AKS Cluster
module "aks" {
  source = "../../modules/aks"

  cluster_name               = "glyph-${local.environment}-aks"
  location                   = local.location
  resource_group_name        = azurerm_resource_group.main.name
  dns_prefix                 = "glyph-${local.environment}"
  subnet_id                  = azurerm_subnet.aks.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  node_count          = 2
  node_size           = "Standard_D2s_v3"
  enable_auto_scaling = true
  min_node_count      = 2
  max_node_count      = 5

  tags = local.tags
}

# Private DNS Zone for PostgreSQL
resource "azurerm_private_dns_zone" "postgresql" {
  name                = "glyph-${local.environment}.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgresql" {
  name                  = "postgresql-vnet-link"
  private_dns_zone_name = azurerm_private_dns_zone.postgresql.name
  virtual_network_id    = azurerm_virtual_network.main.id
  resource_group_name   = azurerm_resource_group.main.name
  registration_enabled  = false
}

# PostgreSQL
module "postgresql" {
  source = "../../modules/postgresql"

  server_name         = "glyph-${local.environment}-pg"
  location            = local.location
  resource_group_name = azurerm_resource_group.main.name
  subnet_id           = azurerm_subnet.db.id
  private_dns_zone_id = azurerm_private_dns_zone.postgresql.id
  admin_username      = "glyphadmin"
  admin_password      = var.db_admin_password

  sku_name               = "B_Standard_B1ms"
  storage_mb             = 32768
  high_availability_mode = "Disabled"

  tags = local.tags
}

variable "db_admin_password" {
  description = "Database administrator password"
  type        = string
  sensitive   = true
}

output "aks_cluster_name" {
  value = module.aks.cluster_name
}

output "postgresql_fqdn" {
  value = module.postgresql.server_fqdn
}
