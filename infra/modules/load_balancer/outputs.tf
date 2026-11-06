output "target_group_arn" {
  value = aws_lb_target_group.alb_target_group.arn
}

output "alb_dns_name" {
  value = aws_lb.alb.dns_name
}

output "alb_arn_suffix" {
  value = aws_lb.alb.arn_suffix
}

output "waf_name" {
  value = aws_wafv2_web_acl.waf.name
}