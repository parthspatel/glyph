variable "cluster_name" {
  description = "Name of the AKS cluster"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "dns_prefix" {
  description = "DNS prefix for the cluster"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.29"
}

variable "node_count" {
  description = "Number of nodes in default pool"
  type        = number
  default     = 3
}

variable "node_size" {
  description = "VM size for default nodes"
  type        = string
  default     = "Standard_D4s_v3"
}

variable "subnet_id" {
  description = "Subnet ID for the cluster"
  type        = string
}

variable "enable_auto_scaling" {
  description = "Enable cluster autoscaling"
  type        = bool
  default     = true
}

variable "min_node_count" {
  description = "Minimum nodes when autoscaling"
  type        = number
  default     = 2
}

variable "max_node_count" {
  description = "Maximum nodes when autoscaling"
  type        = number
  default     = 10
}

variable "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID for monitoring"
  type        = string
}

variable "create_worker_pool" {
  description = "Create dedicated worker node pool"
  type        = bool
  default     = false
}

variable "worker_node_size" {
  description = "VM size for worker nodes"
  type        = string
  default     = "Standard_D4s_v3"
}

variable "worker_node_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 2
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
