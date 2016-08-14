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
    self.add_text('Welcome! Press the button below to begin.');
    add_next_button(exp.main);
}
