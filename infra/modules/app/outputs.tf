output "respository_url" {
  value = aws_ecr_repository.codepulse.repository_url
}

output "ecs_service_name" {
  value = aws_ecs_service.app.name
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "log_group_name" {
  value = aws_cloudwatch_log_group.ecs.name
}

