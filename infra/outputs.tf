# Outputs for the infrastructure resources

# output ecr repository url
output "repository_url" {
  value = aws_ecr_repository.codepulse.repository_url
}

#alb url using alb dns name
output "alb_url" {
  value = "http://${aws_lb.alb.dns_name}"
}

#ecs service name
output "ecs_service_name" {
  value = aws_ecs_service.app.name
}

#ecs cluster name
output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

#log group name
output "log_group_name" {
  value = aws_cloudwatch_log_group.ecs.name
}
