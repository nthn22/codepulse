# alb sg id

output "alb_sg_id" {
  value = aws_security_group.alb_sg.id
}

# task sg id

output "task_sg_id" {
  value = aws_security_group.task_sg.id
}

# rds sg id

output "rds_sg_id" {
  value = aws_security_group.rds_sg.id
}