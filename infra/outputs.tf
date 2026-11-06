# Outputs for the infrastructure resources

# output ecr repository url
output "repository_url" {
  value = module.app.respository_url
}

#alb url using alb dns name
output "alb_url" {
  value = "http://${module.load_balancer.alb_dns_name}"
}

#ecs service name
output "ecs_service_name" {
  value = module.app.ecs_service_name
}

#ecs cluster name
output "ecs_cluster_name" {
  value = module.app.ecs_cluster_name
}

#log group name
output "log_group_name" {
  value = module.app.log_group_name
}
