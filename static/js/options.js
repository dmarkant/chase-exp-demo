/*
 * options.js
 *
 */
var OPTION_BORDER_WIDTH = 25;
var X_MIN = -100;
var X_MAX = 100;

function load_option_sets_binary(path) {

    output(['loading option sets from: ' + path]);
    var results = [];
	$.ajax({url: path,
			success: function(data) {
				$.each(data.split('\n'), function() {
					var optset = this.split(',');
					if (optset[0]!="") {
						results.push({'id': optset[17],
									  'A_x0': Number(optset[3]),
									  'A_x1': Number(optset[4]),
									  'A_p0': Number(optset[5]),
									  'A_ev': Number(optset[6]),
									  'B_x0': Number(optset[10]),
									  'B_x1': Number(optset[11]),
									  'B_p0': Number(optset[12]),
									  'B_ev': Number(optset[13]),
                                      'variance': optset[16]});
					};
				});
			},
            error: function() {
                output('failed to load option sets!');
            },
			async: false
	});
    return results;
};

function load_option_sets_normal(path) {

    output(['loading option sets from: ' + path]);
    var results = [];
	$.ajax({url: path,
			success: function(data) {
				$.each(data.split('\n'), function() {
					var optset = this.split(',');
					if (optset[0]!="") {
						results.push({'id': optset[6],
									  'A_mn': Number(optset[1]),
									  'A_var': Number(optset[3]),
									  'A_ev': Number(optset[1]),
									  'B_mn': Number(optset[2]),
									  'B_var': Number(optset[4]),
									  'B_ev': Number(optset[2]),
                                      'variance': optset[5]});
					};
				});
			},
            error: function() {
                output('failed to load option sets!');
            },
			async: false
	});
    return results;
};



function sample_from_discrete(option) {
	if (Math.random() < option.p) {
		return option.H;
	} else {
		return option.L;
	};
};


function sample_from_normal(option) {
	var dist = NormalDistribution(Math.sqrt(option.variance), option.mn);
	var x = dist.sampleInt();
    if (x < X_MIN) x = X_MIN;
    if (x > X_MAX) x = X_MAX;
    return x;
}


var generate_gamble_from_optset = function(round) {
	var opt = OPTSETS_SAMPLED[round];

    if (CONDITION_ECOLOGY==='binary') {

        var options = {'A': new BinaryProblem('A',
                                           opt['A_x1'],
                                           opt['A_x0'],
                                           opt['A_p0'],
                                           opt['A_ev']),
                       'B': new BinaryProblem('B',
                                           opt['B_x1'],
                                           opt['B_x0'],
                                           opt['B_p0'],
                                           opt['B_ev'])};

    };

    if (CONDITION_ECOLOGY==='normal') {
        var options = {'A': new NormalProblem('A',
                                           opt['A_mn'],
                                           opt['A_var']),
                       'B': new NormalProblem('B',
                                           opt['B_mn'],
                                           opt['B_var'])};
    }

	return {'options': options};
};


var BinaryProblem = function(id, low, high, p, ev) {
	var self = this;
	self.par = {'H': high, 'L': low, 'p': p};
	self.expected_value = ev;
	self.random = function() {
		return sample_from_discrete(self.par);
	};
	return self;
};


var NormalProblem = function(id, mn, variance) {
	var self = this;
	self.par = {'mn': mn, 'variance': variance};
	self.expected_value = mn;
	self.random = function() {
        return sample_from_normal(self.par);
	};
	return self;
};


/*
var generate_gamble = function(N) {
	var options = {};
	$.each(OPTIONS, function(i, id) {
		options[id] = new Urn(id);
	});
	return {'options': options};
};

var discrete_expected_value = function(option) {
	return option['H']*option['p'] + option['L']*(1-option['p']);
};


ranran = new Random(124); // change seed
var Urn = function(id) {
	var self = this;
	self.id = id;

	if (OPT_ENVIRONMENT == 'discrete-normal') {
		var nd1 = NormalDistribution(10, 30);
		var o1 = nd1.sampleInt();
		var nd2 = NormalDistribution(40, 90);
		var o2 = nd2.sampleInt();
		var p = jStat.beta.sample(4, 4);
		output(['[o1, o2, p]:', [o1, o2, p]]);

		self.par = {'H': o1, 'L': o2, 'p': p};
		self.random = function() {
			return sample_from_discrete(self.par);
		};
		self.expected_value = discrete_expected_value(self.par);

	};

	if (OPT_ENVIRONMENT == 'discrete-skewed') {
		var nd1 = NormalDistribution(10, 30);
		var o1 = nd1.sampleInt();
		var nd2 = NormalDistribution(40, 90);
		var o2 = nd2.sampleInt();
		var p = jStat.beta.sample(7, 1);
		output(['[o1, o2, p]:', [o1, o2, p]]);

		self.par = {'H': o1, 'L': o2, 'p': p};
		self.random = function() {
			return sample_from_discrete(self.par);
		};
		self.expected_value = discrete_expected_value(self.par);
		//
	};

};*/


//
// Option object for displaying urn, sampling outcomes,
// and selecting for final choice
//
var Option = function(stage, id, n_options, border_color) {

	var self = this;
	self.id = id;
	self.index = OPTIONS.indexOf(self.id);
	self.stage = stage;

    self.border_color = border_color;

	// work out positioning based on stage size and number of options
	self.row = Math.floor(self.index / 4);
	self.col = self.index % 4;
	self.stage_w = Number(self.stage.attr("width"));
	self.stage_h = Number(self.stage.attr("height"));

	switch (n_options) {
		case 1:
			self.x = self.stage_w/2;
			self.y = 60 + self.stage_h/4;
			break;
		case 2:
			self.x = 220 + (self.stage_w-140)/2 * self.col;
			self.y = 60 + self.stage_h/4;
			break;
		default:
			self.x = 100 + self.stage_w/4 * self.col;
			self.y = 80 + self.stage_h/2 * self.row;
	};

	self.sample_x = self.x;
	self.sample_y = self.y + 50;

	// state variables
	self.chosen = false;
	self.available = true;
	self.n_opp_samples = 0;

	// drawing of options
	self.disp = self.stage.append('g')
						  .attr('id', self.id)
						  .attr('opacity', 1.);

	self.draw = function() {

        self.obj = self.disp.append('rect')
                            .attr('rx', 5)
                            .attr('ry', 5)
                            .attr('x', self.x-100)
                            .attr('y', self.y-80)
                            .attr('width', 250)
                            .attr('height', 250)
                            .style('fill', '#CDCDCD')
                            .style('stroke-width', OPTION_BORDER_WIDTH)
                            .style('stroke', self.border_color)

		if (self.chosen) {
			self.highlight();
		}

		return self;
	};

	self.highlight = function() {
        self.chosen = true;

        self.check = self.disp.append('path')
						  .attr('d', "M6.41 0l-.69.72-2.78 2.78-.81-.78-.72-.72-1.41 1.41.72.72 1.5 1.5.69.72.72-.72 3.5-3.5.72-.72-1.44-1.41z")
						  .attr('width', 110)
						  .attr('height', 110)
						  .attr('stroke', self.border_color)
						  .attr('stroke-width', 0.)
						  .attr('fill', self.border_color)
						  .attr("transform", "translate("+(self.x-20)+","+155+") scale(13)")

        //self.obj.transition()
        //          .delay(100)
        //          .duration(200)
        //          .style('fill', 'white');
		return self;
	};

	self.draw_sample = function(value, loc, duration, backon) {

		loc = loc || [self.sample_x-60, self.sample_y-60];
		backon = backon || false;


        self.outcome = self.disp.append('g').attr('id', 'outcome')
        self.outcome_label = self.outcome.append('text')
				   .attr('x', loc[0]+85)
				   .attr('y', loc[1]+85)
				   .attr('text-anchor', 'middle')
				   .attr('fill', 'black')
				   .attr('class', 'samplefeedback')
				   .text(value)
				   .attr('opacity', 0)
				   .transition()
				     .duration(100)
					 .attr('opacity', 1);

		if (duration!=undefined) {
			setTimeout(function() {
				self.clear_sample();
				if (backon) self.listen();
			}, duration);
		};

	};

	self.clear_sample = function() {
		if (self.outcome != undefined) self.outcome.remove();
	};

	self.listen = function(callback) {
		if (callback!=undefined) self.selection_callback = callback;
		self.disp.on('mousedown', function() {
			self.stop_listening();
			if (self.selection_callback!=undefined) self.selection_callback(self.id);
		});
		return self;
	};

	self.click = function() {
		self.selection_callback(self.id);
	};

	self.stop_listening = function(duration) {
		self.disp.on('mousedown', function() {} );

		if (duration!=undefined) {
			setTimeout(function() {
				self.listen();
			}, duration);
		};

	};

	self.erase = function() {
		self.stage.select(self.id).remove();
	};

	return self;
};
