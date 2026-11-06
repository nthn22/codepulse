# alb config
# * note for the future - if I want to change the target group name or port
# Terraform needs to replace and it will fail while the listener is using the old one
# "ResourceInUse" is the cause and solution is to add create_before_destroy in a lifecycle block

# create the alb 
resource "aws_lb" "alb" {
  name                       = "${var.project_name}-alb"
  internal                   = false
  load_balancer_type         = "application"
  security_groups            = [module.security.alb_sg_id]
  subnets                    = module.network.public_subnet_ids #gets the output of the public subnet ids
  enable_deletion_protection = false                                                                     # set to true in production to prevent accidental deletion, false so destroy is easier
  tags = {
    Name = "${var.project_name}-alb"
  }
}

#create the alb target group

resource "aws_lb_target_group" "alb_target_group" {
  name                 = "${var.project_name}-alb-target-group"
  port                 = 3001
  protocol             = "HTTP"
  vpc_id               = module.network.vpc_id
  target_type          = "ip" # fargate registers tasks by IP address, not instance ID
  deregistration_delay = 30   # so deploy and destroy don't hang for 5 minute (default)
  health_check {
    path                = "/api/health" #health check path from src
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
    matcher             = "200-299"
  }
}

# create the alb listener
resource "aws_lb_listener" "alb_listener" {
  load_balancer_arn = aws_lb.alb.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.alb_target_group.arn #forward to target group
  }
}


# WAF config

# create the WAF web ACL
resource "aws_wafv2_web_acl" "waf" {
  name        = "${var.project_name}-waf"
  description = "WAF for ${var.project_name}"
  scope       = "REGIONAL" # use "CLOUDFRONT" for CloudFront distributions
  default_action {
    allow {}
  }
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-waf"
    sampled_requests_enabled   = true
  }
  #create rules for the WAF web ACL
  #common rule set
  rule {
    name     = "AWS-AWSManagedRulesCommonRuleSet"
    priority = 1
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        # implemented to override SizeRestrictions_Body in the common rule set
        # log instead of block
        rule_action_override {
          name = "SizeRestrictions_BODY"
          action_to_use {
            count {} # used to log
          }
        }
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-waf-rule-1"
      sampled_requests_enabled   = true
    }
  }
  #known bad input set
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-waf-rule-2"
      sampled_requests_enabled   = true
    }
  }
  #sqli rule set
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 3
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-waf-rule-3"
      sampled_requests_enabled   = true
    }
  }
  # rate limit rule
  rule {
    name     = "RateLimitPerIP"
    priority = 4
    action {
      block {}
    }
    statement {
      rate_based_statement {
        limit              = 300 #request limit per 5 minutes
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-waf-rule-4"
      sampled_requests_enabled   = true
    }
  }
}

# waf web acl association
resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = aws_lb.alb.arn            # alb arn
  web_acl_arn  = aws_wafv2_web_acl.waf.arn # web acl's arn
}