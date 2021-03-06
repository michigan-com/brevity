#!/bin/bash

printer(){
    printf '\n' && printf '=%.0s' {1..40} && printf '\n'
    echo $1
    printf '=%.0s' {1..40} && printf '\n'
}

APP_DIR="/srv/sites/brevity"
ENV_DIR="/srv/virtualenvs/brevity"

printer "Deploying BREVITY app ..."
cd $APP_DIR

printer "Grabbing latest source code from MASTER ..."
git stash
git pull origin live

printer "Installing python packages ..."
source $ENV_DIR/bin/activate
pip install -r requirements.txt

printer "Installing node modules ..."
npm install

printer "Running gulp tasks ..."
gulp

printer "Restarting supervisor process ..."
supervisorctl restart brevity

printer "Adding Github tag $(<version.cfg) ..."
git tag -a $(<version.cfg) -m 'New Release'

printer "Pushing tag to repo ..."
git fetch --tags origin
git push origin --tags
