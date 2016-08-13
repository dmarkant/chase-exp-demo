instruction_text_element = function(text) {
	return '<div class="instruction-body">'+text+'</div>';
};


svg_element = function(id, width, height) {
	return '<div class="svg-container" width="'+width+'" height="'+height +
           '"><svg width="'+width+'" height="'+height+'" id="'+id+'"></svg></div>'
};


stage_element = function() {
    return '<div id="stagewrapper">' +
                '<div id="aboveStage"></div>' +
                '<div id="stage"><svg width="800" height="400" id="stagesvg"></svg></div>' +
                '<div id="belowStage"><div id="cost"></div></div>' +
            '</div>';
}



function init_instruction(obj, id) {
	obj.id = id;
	output(['instructions', id]);

	psiTurk.showPage('instruct.html');
	obj.div = $('#container-instructions');

	obj.add_text = function(t) {
		obj.div.append(instruction_text_element(t));
	};

	return obj;
};


var Instructions1 = function() {
	var self = init_instruction(this, 1);

    self.add_text('Welcome! The goal of this study is to understand how people make choices between options '+
                  'based on their experiences. In this experiment, you will play a series '+
                  'of games in which you choose between sets of virtual slot machines.');

    self.add_text('The experiment consists of '+NROUNDS+' games and will last ' +
                  'approximately '+EXPECTED_DURATION+' minutes. At the end of the experiment, you will receive a '+
                  'bonus based on your choices in a randomly '+
                  'selected set of '+N_BONUS_GAMES+' games.');

    self.add_text('If you wish to continue, please press the button below to learn more about the game.');

    add_next_button(Instructions2);

}


var Instructions2 = function() {
	var self = init_instruction(this, 2);

    self.add_text('Each game in this experiment involves a choice between two virtual slot machines, '+
                  'represented by two boxes like these:');

    self.div.append(stage_element())
	self.stage = d3.select('#stagesvg');

    var once = false;

    if (CONDITION_ECOLOGY==='binary') {
        var options = {'A': new BinaryProblem('A', 10, 20, .3, 13),
                       'B': new BinaryProblem('B', 15, 18, .6, 16)};
    };

    if (CONDITION_ECOLOGY==='normal') {
        var options = {'A': new NormalProblem('A', 13, 25),
                       'B': new NormalProblem('B', 16, 25)};
    }
    g = {'options': options};


    var sample = function(id) {
        if (!once) {
            once = true;
            add_next_button(Instructions3);
        };

        options[id].draw_sample(g['options'][id].random(), undefined, SAMPLE_DISPLAY_DURATION, true);
    };


    col = OPTION_BORDER_COLORS[0];
    border_colors = [col, col];

    options = {};
    for (var i=0; i<2; i++) {
        var opt_label = OPTIONS[i];
        options[opt_label] = new Option(self.stage, opt_label, 2, border_colors[i]);
        options[opt_label].draw();
    };
    $.each(options, function(i, opt) {
        opt.listen(sample);
    });

    self.add_text('Each time you click on a machine, it generates a certain number of points. Each machine you encounter '+
                  'will differ in the kinds of outcomes it generates. In each game, you begin by <strong>testing</strong> '+
                  'the machines to learn about their behavior. You are free '+
                  'to test the machines however many times you want and in any order. Go ahead and try it for the two '+
                  'machines shown above by clicking on each one a few times, paying attention to the kinds of outcomes '+
                  'they generate.');

};


var Instructions3 = function() {
	var self = init_instruction(this, 3);

    self.add_text('Your goal in each game is to test the machines to determine which one you want to "play" for ' +
                  'a bonus. Each game ends when you decide to stop testing and make a final choice between the two machines. '+
                  'A final outcome is then generated from your chosen machine, which is your score for the game. '+
                  'At the end of the '+
                  'experiment, a subset of games will be randomly selected and your total bonus will be based on your final scores in '+
                  'those games.');

    self.add_text('After you indicate your choice by clicking on the machine, a checkmark will appear over your choice and you '+
                  'will move on to the next game. Click on one of the machines below to see what it looks like '+
                  'to make a final choice:');

    self.div.append(stage_element())
	self.stage = d3.select('#stagesvg');


    var choose = function(id) {
        $.each(options, function(i, opt) { opt.stop_listening(); });
        options[id].highlight();
        add_next_button(Instructions4);
    };

    col = OPTION_BORDER_COLORS[0];
    border_colors = [col, col];

    options = {};
    for (var i=0; i<2; i++) {
        var opt_label = OPTIONS[i];
        options[opt_label] = new Option(self.stage, opt_label, 2, border_colors[i]);
        options[opt_label].draw();
    };
    $.each(options, function(i, opt) {
        opt.listen(choose);
    });

};


var Instructions4 = function() {
	var self = init_instruction(this, 4);

    self.add_text('There\'s one important catch: In each game, your final score will be reduced based on a <b>testing cost</b> '+
                  'which will vary across games. For example, in some games the cost may be as little as 1 point (as shown below) '+
                  'while in other games the cost may be larger.');

    self.add_text('At the end of the experiment, the outcome generated by each machine you choose '+
                  'will be reduced by the total testing costs from the same game (that is, the number of tests '+
                  'multiplied by the individual testing cost shown at the bottom of the screen). For example, if a chosen '+
                  'machine generates a final bonus of 50 points but you did 20 tests (at 1 point each), then your final '+
                  'score for that game would be 30 points.');

    self.div.append(stage_element())
	self.stage = d3.select('#stagesvg');

    if (CONDITION_ECOLOGY==='binary') {
        var options = {'A': new BinaryProblem('A', 10, 20, .3, 13),
                       'B': new BinaryProblem('B', 15, 18, .6, 16)};
    };

    if (CONDITION_ECOLOGY==='normal') {
        var options = {'A': new NormalProblem('A', 13, 25),
                       'B': new NormalProblem('B', 16, 25)};
    }
    g = {'options': options};


    var sample = function(id) {
        options[id].draw_sample(g['options'][id].random(), undefined, SAMPLE_DISPLAY_DURATION, true);
    };


    col = OPTION_BORDER_COLORS[0];
    border_colors = [col, col];

    options = {};
    for (var i=0; i<2; i++) {
        var opt_label = OPTIONS[i];
        options[opt_label] = new Option(self.stage, opt_label, 2, border_colors[i]);
        options[opt_label].draw();
    };
    $.each(options, function(i, opt) {
        opt.listen(sample);
    });

	$('#cost').html('<h2>Cost per test:<p class=testingcost>-1 point</p></h2>');

	add_next_button(Instructions5);

}


var Instructions5 = function() {
	var self = init_instruction(this, 4);

    self.add_text('Finally, note that each game will feature a <strong>new set</strong> of slot machines. '+
                  'Even though some machines may have features in common (including their color and individual outcomes), '+
                  'no two machines are identical.');

    self.div.append(stage_element())
	self.stage = d3.select('#stagesvg');

    if (CONDITION_ECOLOGY==='binary') {
        var options = {'A': new BinaryProblem('A', -20, -50, .5, -40),
                       'B': new BinaryProblem('B', -30, 15, .6, -10)};
    };

    if (CONDITION_ECOLOGY==='normal') {
        var options = {'A': new NormalProblem('A', -40, 25),
                       'B': new NormalProblem('B', -10, 25)};
    }
    g = {'options': options};


    var sample = function(id) {
        options[id].draw_sample(g['options'][id].random(), undefined, SAMPLE_DISPLAY_DURATION, true);
    };


    col = OPTION_BORDER_COLORS[1];
    border_colors = [col, col];

    options = {};
    for (var i=0; i<2; i++) {
        var opt_label = OPTIONS[i];
        options[opt_label] = new Option(self.stage, opt_label, 2, border_colors[i]);
        options[opt_label].draw();
    };
    $.each(options, function(i, opt) {
        opt.listen(sample);
    });

	$('#cost').html('<h2>Cost per test:<p class=testingcost>-1 point</p></h2>');

	add_next_button(InstructionsQuiz);

}



var InstructionsQuiz = function() {
	output(['instructions', 'preq']);
	var self = this;
	psiTurk.showPage('preq.html');

    var checker = function() {
		var errors = [];

		if ($('#testingpurpose option:selected').val() != "0") {
			errors.push("testingpurpose");
		};
		if ($('#testingcost option:selected').val() != "2") {
			errors.push("testingcost");
		};
		if ($('#uniqueness option:selected').val() != "2") {
			errors.push("uniqueness");
		};
		if ($('#bonus option:selected').val() != "2") {
			errors.push("bonus");
		};

		output(['instructions', 'preq', 'nerrors', errors.length]);
		output(['instructions', 'preq', 'errors', errors]);

		if (errors.length == 0) {
			InstructionsComplete();
		} else {
			$('#btn-continue').hide();
			for(var i=0; i<errors.length; i++) {
				$('#'+errors[i]).css("border","2px solid red");
			};
			$("#warning").css("color","red");
			$("#warning").html("<p>Looks like you answered some questions incorrectly (highlighted in red). Please review them and click the \"Repeat\" button at the bottom to see the instructions again.</p>");
		};

	};


	$('#btn-startover').on('click', function() {
		output('instructions', 'restart');
		Instructions2();
	});

	$('#btn-continue').on('click', function() { checker(); });

};


var InstructionsComplete = function() {
	var self = init_instruction(this, 'complete');

    self.add_text('Good job! Looks like you are ready to begin. You will now complete ' +
                  NROUNDS + ' games. After you have finished, you will see the results from playing the machines that you ' +
                  'chose along with your final bonus for the experiment.');

    self.add_text('<strong>Please stay focused on the task until it is complete. Please do not use any external aids ' +
                  'during the experiment (e.g., pencil and paper, screenshots, etc.). If you are inactive for too ' +
                  'long, the experiment will end automatically and you will forgo bonus payments. Once you have started ' +
                  'you will be unable to reload the page.</strong>');

    self.add_text('Click below to get started. Good luck!');

    add_next_button(exp.main);

};
