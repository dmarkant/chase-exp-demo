# this file imports custom routes into the experiment server

from flask import Blueprint, render_template, request, jsonify, Response, abort, current_app, make_response
from jinja2 import TemplateNotFound
from functools import wraps
from sqlalchemy import or_

from psiturk.psiturk_config import PsiturkConfig
from psiturk.experiment_errors import ExperimentError
from psiturk.user_utils import PsiTurkAuthorization, nocache

# # Database setup
from psiturk.db import db_session, init_db
from psiturk.models import Participant
from json import dumps, loads

# load the configuration options
config = PsiturkConfig()
config.load_config()
myauth = PsiTurkAuthorization(config)  # if you want to add a password protect route use this

# explore the Blueprint
custom_code = Blueprint('custom_code', __name__, template_folder='templates', static_folder='static')



@custom_code.route('/setup')
def setup():
    current_app.logger.info("Reached /setup")  # Print message to server.log for debugging

    # get list of valid partners to choose from
    q = Participant.query.\
        filter(Participant.status >= 1).\
        all()

    partner_ids = []
    try:
        return render_template('setup.html',
                               partner_ids=partner_ids)
    except TemplateNotFound:
        abort(404)


@custom_code.route('/check', methods=['GET'])
def check_participant_id():
    current_app.logger.info("Reached /check")  # Print message to server.log for debugging
    uniqueId = request.args['uniqueId']

    # lookup user in database
    user = Participant.query.\
           filter(Participant.workerid == uniqueId).\
           all()

    if len(user) == 0:
        current_app.logger.info("No existing user with id %s" % uniqueId)  # Print message to server.log for debugging
        valid_id = True
    else:
        current_app.logger.info("Already an existing user with id %s!" % uniqueId)  # Print message to server.log for debugging
        valid_id = False

    return jsonify({'valid_id': valid_id})


@custom_code.route('/participantdata', methods=['GET'])
def get_participant_data():
    current_app.logger.info("Reached /participantdata")  # Print message to server.log for debugging
    participantid = request.args['participantid']

    # lookup user in database
    part = Participant.query.\
           filter(Participant.workerid == participantid).\
           one()

    part_data = loads(part.datastring)
    data = []
    for d in part_data['data']:
        if d['trialdata'][0] == "test":
            data.append(d)

    return jsonify({'participant_data': data})


#----------------------------------------------
# example custom route
#----------------------------------------------
@custom_code.route('/my_custom_view')
def my_custom_view():
	current_app.logger.info("Reached /my_custom_view")  # Print message to server.log for debugging
	try:
		return render_template('custom.html')
	except TemplateNotFound:
		abort(404)

#----------------------------------------------
# example using HTTP authentication
#----------------------------------------------
@custom_code.route('/my_password_protected_route')
@myauth.requires_auth
def my_password_protected_route():
	try:
		return render_template('custom.html')
	except TemplateNotFound:
		abort(404)





#----------------------------------------------
# example accessing data
#----------------------------------------------
@custom_code.route('/view_data')
@myauth.requires_auth
def list_my_data():
        users = Participant.query.all()
	try:
		return render_template('list.html', participants=users)
	except TemplateNotFound:
		abort(404)

#----------------------------------------------
# example computing bonus
#----------------------------------------------

@custom_code.route('/compute_bonus', methods=['GET'])
def compute_bonus():
    # check that user provided the correct keys
    # errors will not be that gracefull here if being
    # accessed by the Javascrip client
    if not request.args.has_key('uniqueId'):
        raise ExperimentError('improper_inputs')  # i don't like returning HTML to JSON requests...  maybe should change this
    uniqueId = request.args['uniqueId']

    try:
        # lookup user in database
        user = Participant.query.\
               filter(Participant.uniqueid == uniqueId).\
               one()
        user_data = loads(user.datastring) # load datastring from JSON
        bonus = 0

        for record in user_data['data']: # for line in data file
            trial = record['trialdata']
            if trial['phase']=='TEST':
                if trial['hit']==True:
                    bonus += 0.02
        user.bonus = bonus
        db_session.add(user)
        db_session.commit()
        resp = {"bonusComputed": "success"}
        return jsonify(**resp)
    except:
        abort(404)  # again, bad to display HTML, but...


