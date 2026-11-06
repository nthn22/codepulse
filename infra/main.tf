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
  vpc_id       = module.network.vpc_id   # root passes it in
}

# create database module
module "database" {
  source         = "./modules/database"
  project_name   = var.project_name
  db_subnet_ids  = module.network.db_subnet_ids
  rds_sg_id      = module.security.rds_sg_id
}

# create load balancer module
module "load_balancer" {
  source            = "./modules/load_balancer"
  project_name      = var.project_name
  vpc_id            = module.network.vpc_id
  public_subnet_ids = module.network.public_subnet_ids
  alb_sg_id         = module.security.alb_sg_id
  # make sure the load balancer module exists
  depends_on = [module.load_balancer]
}