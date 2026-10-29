# alb config
# * note for the future - if I want to change the target group name or port
# Terraform needs to replace and it will fail while the listener is using the old one
# "ResourceInUse" is the cause and solution is to add create_before_destroy in a lifecycle block

# create the alb 
resource "aws_lb" "alb" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [for k, v in local.subnets : aws_subnet.this[k].id if v.tier == "public"] # get all public subnets for the alb
  enable_deletion_protection = false # set to true in production to prevent accidental deletion, false so destroy is easier
  tags = {
    Name = "${var.project_name}-alb"
  }
}

#create the alb target group

## look to make a /api/health route for health check since there isn't one
resource "aws_lb_target_group" "alb_target_group" {
  name     = "${var.project_name}-alb-target-group"
  port     = 3001
  protocol = "HTTP"
  vpc_id   = aws_vpc.main_vpc.id
  target_type = "ip" # fargate registers tasks by IP address, not instance ID
  deregistration_delay = 30 # so deploy and destroy don't hang for 5 minute (default)
  health_check {
    path                = "/"
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