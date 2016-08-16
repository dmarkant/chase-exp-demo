condition = [0, 1].sample(1)[0]

var LOGGING = true,
	SKIP_INSTRUCTIONS = false,
	exp,
	NROUNDS = 24,
	EXPECTED_DURATION = 30,
	N_BONUS_GAMES = 5,
	N_OPTIONS = 2,
	OPTIONS = ['A', 'B'],
	OPTION_FADE_OPACITY = 0.3,
	OPTION_BORDER_COLORS = ['#CB3232', '#3246CB', '#32CB53', '#CBCB32'],
	SAMPLING_COSTS = {'low': 1, 'high': 5},
	SAMPLE_DISPLAY_DURATION = 800,
	INIT_BONUS = 0,
	BASE_PAYMENT = 1,
	MAX_BONUS = 3,
	COMPLETION_BONUS = .5,
	CONVERSION_RATE = .01,
	chosen_options = [],
	total_sampling_cost = [],
	final_bonus,
	INACTIVITY_DEADLINE_MIN = 4,
	previous_colors = [];


// Initialize psiturk object and preload resources
var psiTurk = new PsiTurk(uniqueId, adServerLoc, mode);
psiTurk.preloadPages(['instruct.html',
					  'stage.html',
					  'feedback.html',
					  'preq.html',
					  'postq.html']);
psiTurk.preloadImages(['static/images/pot.png',
					   'static/images/person_other.png',
					   'static/images/person_self.png']);


// loading/sampling option sets
//var CONDITION_ECOLOGY = (condition < 2) ? 'normal' : 'binary';
var CONDITION_ECOLOGY = 'normal';
if (CONDITION_ECOLOGY==='binary') {
	var OPTSETS_PATH = 'static/problems_binary.csv'; // predefined option sets
	var OPTSETS = load_option_sets_binary(OPTSETS_PATH);
} else if (CONDITION_ECOLOGY==='normal') {
	var OPTSETS_PATH = 'static/problems_normal.csv'; // predefined option sets
	var OPTSETS = load_option_sets_normal(OPTSETS_PATH);
}
var OPTSETS_LOW_VAR = shuffle(_.filter(OPTSETS, function(opt) {return opt['variance']==='low';}));
var OPTSETS_HIGH_VAR = shuffle(_.filter(OPTSETS, function(opt) {return opt['variance']==='high';}));


// color condition
var CONDITION_COLOR = ['same', 'diff'][condition % 2];


// setup within-subject conditions
// 2 mini-blocks of 12 games
mb = [['low', 'low'],
	  ['low', 'low'],
	  ['low', 'low'],
	  ['low', 'high'],
	  ['low', 'high'],
	  ['low', 'high'],
	  ['high', 'low'],
	  ['high', 'low'],
	  ['high', 'low'],
	  ['high', 'high'],
	  ['high', 'high'],
	  ['high', 'high']]
var GAME_SETTINGS = [];
var OPTSETS_SAMPLED = [];
for (var b=0; b<2; b++) {
	mb = shuffle(mb);
	$.each(mb, function(i, c) {
		var variance = c[1];
		if (variance==='low') {
			OPTSETS_SAMPLED.push(OPTSETS_LOW_VAR.pop());
		} else {
			OPTSETS_SAMPLED.push(OPTSETS_HIGH_VAR.pop());
		}
		GAME_SETTINGS.push({'cost': c[0],
						    'variance': c[1]});
	})
}


// Generic function for saving data
function output(arr) {
    psiTurk.recordTrialData(arr);
    if (LOGGING) {
		console.log(arr);
	}
};


// Idle time tracking
var idleTime = 0,
	idleInterval;
function startIdleTracking() {
	output(['starting to track idle time']);

	//Increment the idle time counter every minute.
    idleInterval = setInterval(timerIncrement, 60000); // 1 minute

    //Zero the idle timer on mouse movement or key press
    $(window).on('mousemove', function (e) {
        idleTime = 0;
    });
    $(window).on('keypress', function (e) {
        idleTime = 0;
    });
};

function timerIncrement() {
    idleTime = idleTime + 1;
	output(['current # idle minutes: ' + idleTime]);
    if (idleTime >= INACTIVITY_DEADLINE_MIN) {
		output(['idle for more than '+INACTIVITY_DEADLINE_MIN+' minutes']);
    	AbortUponInactivity();
	}
}

function stopIdleTracking() {
	output(['stopped tracking idle time']);
	clearInterval(idleInterval);
};

function AbortUponInactivity() {
	var self = init_instruction(this, 'abort');
	output(['aborting due to inactivity'])
	$('#main').html('');
	$('h1').css('display', 'none');
	self.add_text('Your session has been ended due to inactivity ('+INACTIVITY_DEADLINE_MIN+' minutes). ' +
				  'Unfortunately, you will not be able to participate in the ' +
				  'experiment again. Please press the button below to return to mturk.com.');
	psiTurk.saveData();
	add_next_button(Exit);
};


// Leaving early
function catch_leave() {
	$(window).on("beforeunload", function(){
		output(['leave warning']);
		psiTurk.saveData();
		return "By leaving or reloading this page, you opt out of the experiment "+
		       "and forgo bonus payments.  Are you sure you want to leave?";
	});
};

function save_on_unload() {
	$(window).on("unload", function() {
		output(['left']);
		psiTurk.saveData();
	});
};


// Buttons
function clear_buttons() {
	$('#buttons').html('');
};

function add_next_button(callback) {
	$('#buttons').append('<button id=btn-next class="btn btn-default btn-lg">Continue</button>');
	$('#btn-next').on('click', callback);
};

function add_stop_button(stop_callback) {
	$('#buttons').append('<button id=btn-stop class="btn btn-default btn-lg">Stop and Choose</button>');
	$('#btn-stop').on('click', stop_callback);
};



var SamplingGame = function(round, callback, practice) {

	var self = this;
	self.round = round;
	self.practice = practice;
	self.trial = -1;
	self.n_options = N_OPTIONS;
	var opt = OPTSETS_SAMPLED[round];
	self.gamble = generate_gamble_from_optset(self.round);

	// sampling cost condition
	self.sampling_cost = GAME_SETTINGS[round]['cost']
	if (self.sampling_cost==='low') {
		self.sampling_cost_str = '-1 point';
	} else {
		self.sampling_cost_str = '-5 points';
	}

	// color condition
	if (CONDITION_COLOR==='same') {
		// change color on every subsequent round
		var avail = _.filter(OPTION_BORDER_COLORS, function(col) { return previous_colors.indexOf(col)==-1; });
		var col = avail.sample(1)[0];
		self.border_colors = [col, col];
	} else {
		if (self.round==0) {
			self.border_colors = OPTION_BORDER_COLORS.sample(2);
		} else {
			// retain one color from each round to the next
			var kept_col = previous_colors.sample(1)[0];
			var avail = _.filter(OPTION_BORDER_COLORS, function(col) {
				return previous_colors.indexOf(col)==-1;
			});
			var new_col = avail.sample(1)[0];
			self.border_colors = shuffle([kept_col, new_col]);
		}
	}

	// store current colors for the next round
	previous_colors = self.border_colors;

	// output state
	output(['game', self.round, 'sampling_cost', self.sampling_cost, self.sampling_cost_str]);
	output(['game', self.round, 'problem', opt['id'], opt['variance']]);
	output(['game', self.round, 'option_color', 'A', OPTION_BORDER_COLORS.indexOf(self.border_colors[0]), self.border_colors[0]]);
	output(['game', self.round, 'option_color', 'B', OPTION_BORDER_COLORS.indexOf(self.border_colors[1]), self.border_colors[1]]);


	self.begin = function() {
		self.reset_stage(self.sampling_trial);
	};


	self.reset_stage = function(callback) {
		psiTurk.showPage('stage.html');
		self.stage = d3.select("#stagesvg");
		self.above_stage = d3.select("#aboveStage");
		self.below_stage = d3.select("#belowStage");
		self.instruction = d3.select("#instruction");
		self.buttons = d3.select("#buttons");

		setTimeout(function() {
			self.above_stage.html('<h1>GAME '+(self.round+1)+'/'+NROUNDS+'</h1>');
			$('#cost').html('<h2>Cost per test:<p class=testingcost>'+self.sampling_cost_str+'</p></h2>');
			self.options = {};
			rOPT = shuffle(['A', 'B']);
			for (var i=0; i<self.n_options; i++) {
				var opt_label = rOPT[i];
				output(['game', self.round, 'option', opt_label, i,
						self.gamble.options[opt_label]['expected_value']]);
				self.options[opt_label] = new Option(self.stage, opt_label, i, self.n_options, self.border_colors[i]);
				self.options[opt_label].draw();
			};
			self.set_instruction('Click the machine you want to test!');
			callback();
		}, 300);
	};


	self.set_instruction = function(text) {
		self.instruction.html(text);
	};


	self.sampling_trial = function() {

		$.each(self.options, function(i, opt) {
			opt.listen(self.generate_sample);
		});

	};


	self.generate_sample = function(chosen_id) {
		self.trial += 1

		$('.testingcost').css({'color': 'black'});
		setTimeout(function() {
			$('.testingcost').css({'color': '#BDBDBD'});
		}, SAMPLE_DISPLAY_DURATION);

		result = self.gamble.options[chosen_id].random();
		output(['game', self.round, 'sample', self.trial, chosen_id, result]);
		$.each(self.options, function(i, opt) { opt.stop_listening(SAMPLE_DISPLAY_DURATION); });
		self.options[chosen_id].draw_sample(result, undefined, SAMPLE_DISPLAY_DURATION);

		if (self.trial==0) {
			self.set_instruction('Click the machine you want to test!<br />Press the button below to stop when you are ready to make a final choice.');
			add_stop_button(
				function() {
					self.stop_trial = self.trial;
					self.urn_selection();
			});
		}
	};


	self.urn_selection = function() {
		output(['game', self.round, 'stop']);
		$.each(self.options, function(i, opt) { opt.clear_sample(); });
		clear_buttons();

		var make_selection = function(chosen_id) {
			$.each(self.options, function(i, opt) { opt.stop_listening(); });
			self.chosen_id = chosen_id;
			self.options[chosen_id].chosen = true;
			self.options[chosen_id].highlight();
			self.finish();
		};

		$.each(self.options, function(i, opt) {
			opt.listen(make_selection)
		});
		self.set_instruction('Click on the machine you want to play for a bonus!');
	};


	self.finish = function() {
		output(['game', self.round, 'choice', self.chosen_id])

		chosen_options.push(self.gamble.options[self.chosen_id]);
		total_sampling_cost.push((1 + self.trial) * SAMPLING_COSTS[self.sampling_cost]);

		self.set_instruction('Your choice for this game has been recorded.<br />'+
							 'Your total testing costs for this round add up to <strong>-'+total_sampling_cost[self.round]+' points</strong>.<br />' +
							 'Click below to continue to the next game!');
		add_next_button(exp.next);
	};

	self.reset_stage(self.begin);
	return self;
};


var PostQuestionnaire = function() {
	$('#main').html('');
	var self = this;
	psiTurk.showPage('postq.html');
	self.div = $('#container-instructions');

	var t = 'All done! Please answer the following questions in order to see your final bonus.';
	self.div.append(instruction_text_element(t));

	record_responses = function() {

		psiTurk.recordTrialData(['postquestionnaire', 'submit']);

		$('textarea').each( function(i, val) {
			psiTurk.recordUnstructuredData(this.id, this.value);
		});
		$('select').each( function(i, val) {
			psiTurk.recordUnstructuredData(this.id, this.value);
		});

		Feedback();
	};

	$("#btn-submit").click(function() {
		record_responses();
	});

};


var Feedback = function() {
	$('#main').html('');
	var self = this;
	psiTurk.showPage('feedback.html');
	self.div = $('#container-instructions');

	// randomly sample games
	var selected = range(NROUNDS).sample(N_BONUS_GAMES);

	// generate payoffs
	var payoffs = [];
	var costs = [];
	var bonuses = [];
	final_bonus = INIT_BONUS + COMPLETION_BONUS;
	for (var i=0; i<N_BONUS_GAMES; i++) {
		payoffs[i] = chosen_options[selected[i]].random();
		costs[i] = total_sampling_cost[selected[i]];
		bonuses[i] = (payoffs[i] - costs[i]) * CONVERSION_RATE;
		output(['instructions', 'feedback', 'selected_game', i, selected[i], payoffs[i], costs[i], bonuses[i]]);
		final_bonus += bonuses[i];
	};
	final_bonus = Math.max(0, Math.min(MAX_BONUS, final_bonus));

	// calculate final bonus
	output(['instructions', 'feedback', 'final_bonus', final_bonus]);


	var t = 'Thank you for your participation! Now you can see the results of your choices across all the games you ' +
		    'played, and how they add up to your final bonus:';
	self.div.append(instruction_text_element(t));

	html = '<table id=feedback-table>'+
		   '<tr style="border-bottom: 1px solid black; font-weight: bold;">' +
		   '<td></td><td>Points</td><td>Total testing costs</td><td>Bonus</td></tr>';

	for (var i=0; i<N_BONUS_GAMES; i++) {
		html +=	'<tr><td>Game '+(i+1)+':</td>' +
				'<td>'+payoffs[i]+'</td>' +
				'<td>'+costs[i]+'</td>' +
				'<td>'+(bonuses[i]).toFixed(2)+'</td>' +
				'</tr>';
	};

	html += '<tr style="border-top: 1px solid black; font-weight: bold;">' +
		    '<td>Completion bonus:</td><td></td><td></td><td>$'+COMPLETION_BONUS.toFixed(2)+'</td></tr>'+
			'<tr style="border-top: 1px solid black; font-weight: bold;">' +
		    '<td>Final bonus:</td><td></td><td></td><td>$'+final_bonus.toFixed(2)+'</td></tr>'+
			'</table>';
	self.div.append(html);

	var error_message = '<h1>Oops!</h1><p>Something went wrong submitting your HIT. '+
					    'Press the button to resubmit.</p><button id=resubmit>Resubmit</button>';

    var t = 'Please press the button below to complete the experiment and return to MTurk.com:';
	self.div.append(instruction_text_element(t));

	$("#btn-submit").click(function() {
		Exit();
	});

};



var Exit = function() {
	output('COMPLETE');
	psiTurk.saveData();
	psiTurk.completeHIT();
};


var SamplingExperiment = function() {
	var self = this;
	self.round = -1;
	chosen_options = [];
	output(['condition', condition]);
	output(['condition_color', CONDITION_COLOR]);
	output(['condition_ecology', CONDITION_ECOLOGY]);

	self.next = function() {
		psiTurk.saveData();
		self.round += 1;
		if (self.round < NROUNDS) self.view = new SamplingGame(self.round, self.next, false);
		else self.finish();
	};

	self.instructions = function() {
		Instructions1();
	};

	self.main = function() {
		//psiTurk.finishInstructions();
		//startIdleTracking();
		self.next();
	}

	self.begin = function(group) {
		if (!SKIP_INSTRUCTIONS) self.instructions();
		else self.main();
	};

	self.finish = function() {
		//stopIdleTracking();
		PostQuestionnaire();
	};

};

// vi: noexpandtab tabstop=4 shiftwidth=4
