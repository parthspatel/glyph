output "server_id" {
  description = "The PostgreSQL server ID"
  value       = azurerm_postgresql_flexible_server.main.id
}

output "server_fqdn" {
  description = "The FQDN of the PostgreSQL server"
  value       = azurerm_postgresql_flexible_server.main.fqdn
}

output "database_name" {
  description = "The database name"
  value       = azurerm_postgresql_flexible_server_database.glyph.name
}

output "connection_string" {
  description = "PostgreSQL connection string"
  value       = "postgres://${var.admin_username}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/${var.database_name}?sslmode=require"
  sensitive   = true
}
