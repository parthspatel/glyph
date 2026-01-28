output "cluster_id" {
  description = "The AKS cluster ID"
  value       = azurerm_kubernetes_cluster.main.id
}

output "cluster_name" {
  description = "The AKS cluster name"
  value       = azurerm_kubernetes_cluster.main.name
}

output "kube_config" {
  description = "Kube config for the cluster"
  value       = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive   = true
}

output "kubelet_identity" {
  description = "Kubelet managed identity"
  value       = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
}

output "cluster_identity" {
  description = "Cluster managed identity"
  value       = azurerm_kubernetes_cluster.main.identity[0].principal_id
}
