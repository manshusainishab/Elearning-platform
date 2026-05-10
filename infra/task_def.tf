resource "aws_ecs_task_definition" "theta_backend" {
  family                   = "theta-backend"
  cpu                      = "256"
  memory                   = "512"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]

  execution_role_arn = aws_iam_role.ecs_task_execution.arn
  task_role_arn      = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "theta-backend"
      image     = "${aws_ecr_repository.theta_backend.repository_url}:v0.0.1"
      essential = true

      portMappings = [
        {
          containerPort = 5000
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "PORT", value = "5000" },
        { name = "AWS_REGION", value = "ap-south-1" },
        { name = "S3_UPLOADS_BUCKET", value = aws_s3_bucket.uploads.bucket },
        { name = "frontendurl", value = "https://elearning-bice.vercel.app" },
      ]

      secrets = [
        { name = "DB", valueFrom = "${aws_secretsmanager_secret.app.arn}:DB::" },
        { name = "Activation_Secret", valueFrom = "${aws_secretsmanager_secret.app.arn}:Activation_Secret::" },
        { name = "Password", valueFrom = "${aws_secretsmanager_secret.app.arn}:Password::" },
        { name = "Gmail", valueFrom = "${aws_secretsmanager_secret.app.arn}:Gmail::" },
        { name = "Jwt_Secret", valueFrom = "${aws_secretsmanager_secret.app.arn}:Jwt_Secret::" },
        { name = "Razorpay_Key", valueFrom = "${aws_secretsmanager_secret.app.arn}:Razorpay_Key::" },
        { name = "Razorpay_Secret", valueFrom = "${aws_secretsmanager_secret.app.arn}:Razorpay_Secret::" },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.theta_backend.name
          awslogs-region        = "ap-south-1"
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])
}
