# ecr repository for the CodePulse image
# tag immutable to prevent overwriting existing images
# *note - means can't push same tag twice, tag each image with something unique


#create ecr repo for codepulse image
resource "aws_ecr_repository" "codepulse" {
  name                 = "${var.project_name}-repo"
  image_tag_mutability = "IMMUTABLE" #prevent overwriting existing images
  image_scanning_configuration {
    scan_on_push = true #supply-chain rule in security table
  }
  force_delete = true # allows deletion of the repo even if it has images in it
}

# ecr lifecycle policy to keep only the last 5 images in the repo. This is to prevent the repo from getting too large and to keep the cost down. 
# The policy is applied to the repository after it is created.
resource "aws_ecr_lifecycle_policy" "codepulse" {
  repository = aws_ecr_repository.codepulse.name

  # jsonencode instead of policy for readability and easier debugging 
  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "keep last 5 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 5
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}









