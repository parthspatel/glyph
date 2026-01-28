variable "server_name" {
  description = "Name of the PostgreSQL server"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "postgresql_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "16"
}

variable "subnet_id" {
  description = "Subnet ID for private endpoint"
  type        = string
}

variable "private_dns_zone_id" {
  description = "Private DNS zone ID"
  type        = string
}

variable "admin_username" {
  description = "Administrator username"
  type        = string
}

variable "admin_password" {
  description = "Administrator password"
  type        = string
  sensitive   = true
}

variable "availability_zone" {
  description = "Availability zone"
  type        = string
  default     = "1"
}

variable "storage_mb" {
  description = "Storage size in MB"
  type        = number
  default     = 32768
}

variable "sku_name" {
  description = "SKU name for the server"
  type        = string
  default     = "GP_Standard_D2s_v3"
}

variable "high_availability_mode" {
  description = "High availability mode"
  type        = string
  default     = "ZoneRedundant"
}

variable "standby_zone" {
  description = "Standby availability zone"
  type        = string
  default     = "2"
}

variable "database_name" {
  description = "Name of the database"
  type        = string
  default     = "glyph"
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
