node('server-misc') {
  timestamps() {
    stage('Install') {
      checkout scm
      sh 'npm ci'
    }

    stage('Generate API') {
      sh 'npm run generate-api'
    }

    stage('Build') {
      sh 'npm run build'
    }

    stage('Deploy') {
      if (env.BRANCH_NAME == 'master') {
        sh 'rsync -a --delete build/ /var/www/sgct.dev/build/'
      }
      else {
        echo "Skipping deploy on branch ${env.BRANCH_NAME}"
      }
    }
  }
}
