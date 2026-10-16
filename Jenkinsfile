pipeline {
  agent any

  options {
    disableConcurrentBuilds()
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '20'))
    skipDefaultCheckout(true)
    // The first compiler and OCR image builds download TeX and OCR models.
    timeout(time: 60, unit: 'MINUTES')
  }

  // The Compose project name comes from docker-compose.yml, so the stack and
  // its volumes match a deployment started by hand from docs/deployment.md.
  environment {
    DOCKER_BUILDKIT = '1'
    CI_IMAGE = "job-application-assistant-ci:${env.BUILD_NUMBER}"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Validate Build Setup') {
      steps {
        sh '''
          set -eu

          if ! command -v docker >/dev/null 2>&1; then
            echo "Docker CLI is not installed in this Jenkins agent."
            echo "If Jenkins is running from Docker, install docker-ce-cli in its image and mount /var/run/docker.sock."
            exit 127
          fi

          docker --version

          if ! docker compose version >/dev/null 2>&1; then
            echo "The Docker Compose plugin is not installed in this Jenkins agent."
            echo "Install the docker-compose-plugin package in the Jenkins image."
            exit 127
          fi

          docker compose version

          # The Test stage's docker build fails without it once BuildKit is on.
          if ! docker buildx version >/dev/null 2>&1; then
            echo "The Docker Buildx plugin is not installed in this Jenkins agent."
            echo "Install the docker-buildx-plugin package in the Jenkins image."
            exit 127
          fi

          if ! docker ps >/dev/null 2>&1; then
            echo "Jenkins cannot access the Docker daemon."
            echo "If Jenkins is running from Docker, mount /var/run/docker.sock and add the container to the socket group."
            exit 1
          fi

          sh scripts/jenkins-compose.sh validate-build
        '''
      }
    }

    stage('Test') {
      steps {
        sh '''
          set -eu

          # The builder stage runs the lint gate and the production build.
          docker build --pull --target builder --tag "$CI_IMAGE" .
          docker run --rm "$CI_IMAGE" sh -c 'pnpm run format:check && pnpm run typecheck && pnpm run test'
        '''
      }
      post {
        always {
          // Only the tag goes; the build cache is reused by the image builds.
          sh 'docker image rm "$CI_IMAGE" >/dev/null 2>&1 || true'
        }
      }
    }

    stage('Build Images') {
      steps {
        sh '''
          set -eu

          sh scripts/jenkins-compose.sh build
        '''
      }
    }

    stage('Deploy') {
      steps {
        // Bind outside any dir() block so the temporary file stays outside the checkout.
        withCredentials([file(credentialsId: 'job-assistant-production-env', variable: 'JAA_ENV_FILE')]) {
          sh 'sh scripts/jenkins-compose.sh deploy'
        }
      }
    }
  }
}