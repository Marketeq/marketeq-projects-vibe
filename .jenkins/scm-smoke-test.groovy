// Throwaway smoke test: proves Jenkins can read a pipeline script from this
// private repo using the `github-git` credential. Safe to delete once the
// real jobs are converted to CpsScmFlowDefinition.
pipeline {
    agent any
    options { timeout(time: 3, unit: 'MINUTES') }
    stages {
        stage('Proof') {
            steps {
                echo "SCM checkout worked -- this script came from git, not from the job config."
                echo "If you can read this in the build log, .jenkins/*.groovy is now authoritative."
            }
        }
    }
}
