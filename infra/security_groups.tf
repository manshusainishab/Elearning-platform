resource "aws_security_group" "alb" {
  name        = "theta-alb-sg"
  description = "ALB - public ingress on 80/443"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "theta-alb-sg"
  }
}

resource "aws_security_group" "ecs_task" {
  name        = "theta-ecs-task-sg"
  description = "ECS tasks - inbound only from ALB on app port"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "From ALB on app port"
    from_port       = 5000
    to_port         = 5000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "theta-ecs-task-sg"
  }
}
