# main terraform file

# create network module
module "network" {
  source = "./modules/network"

  project_name    = var.project_name
  vpc_cidr        = var.vpc_cidr
  use_nat_gateway = var.use_nat_gateway
}

# create security module
module "security" {
  source       = "./modules/security"
  project_name = var.project_name
  vpc_id       = module.network.vpc_id # root passes it in
}

# create database module
module "database" {
  source        = "./modules/database"
  project_name  = var.project_name
  db_subnet_ids = module.network.db_subnet_ids
  rds_sg_id     = module.security.rds_sg_id
}

# create load balancer module
module "load_balancer" {
  source            = "./modules/load_balancer"
  project_name      = var.project_name
  vpc_id            = module.network.vpc_id
  public_subnet_ids = module.network.public_subnet_ids
  alb_sg_id         = module.security.alb_sg_id
}

module "app" {
  source           = "./modules/app"
  project_name     = var.project_name
  app_subnet_ids   = module.network.app_subnet_ids
  task_sg_id       = module.security.task_sg_id
  target_group_arn = module.load_balancer.target_group_arn
  db_secret_arn    = module.database.db_secret_arn
  use_nat_gateway  = var.use_nat_gateway
  desired_count    = var.desired_count
  image_tag        = var.image_tag
  # make sure the load balancer module exists
  depends_on = [module.load_balancer]
}

module "monitoring" {
  source         = "./modules/monitoring"
  project_name   = var.project_name
  alert_email    = var.alert_email
  alb_arn_suffix = module.load_balancer.alb_arn_suffix
  waf_name       = module.load_balancer.waf_name
}
