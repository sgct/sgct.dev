node('server-misc') {
  timestamps() {
    stage('Install') {
      checkout scm
      sh 'npm ci'
    }

    stage('Lint') {
      sh 'npm run lint'
    }

    stage('Generate API') {
      sh 'npm run generate-api'
    }

    stage('Validate configurations') {
      // Validates against the schema of the SGCT checkout that 'Generate API' fetched, so
      // that the API reference and the example files are checked against the same
      // revision
      sh 'SGCT_SOURCE_DIR=.doxygen-cache/sgct npm run validate-configs'
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
