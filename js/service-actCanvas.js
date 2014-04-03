/* Activity canvas drawing service */

angular.module('Geographr.actCanvas', [])
.factory('actCanvasUtility', function(canvasUtility) {
        var eventLowCanvas = document.getElementById('eventLowCanvas'); // Event view
        var eventMainCanvas = document.getElementById('eventMainCanvas');
        var eventHighCanvas = document.getElementById('eventHighCanvas');
        var eventLowContext = eventLowCanvas.getContext ? eventLowCanvas.getContext('2d') : null;
        var eventMainContext = eventMainCanvas.getContext ? eventMainCanvas.getContext('2d') : null;
        var eventHighContext = eventHighCanvas.getContext ? eventHighCanvas.getContext('2d') : null;
        canvasUtility.fillCanvas(eventLowContext,'2e3338');
        var flip = function() { // Flip a coin
            return Math.random() > 0.5;
        };
        return {
            fillCanvas: function(context,color) {
                var method = color == 'erase' ? 'clearRect' : 'fillRect';
                if(color != 'erase') { context.fillStyle = color.charAt(0) == 'r' ? color : '#' + color; }
                context[method](0,0,1200,750);
            },
            drawActivity: function(type,event) {
                Math.seedrandom();
                switch(type) {
                    case 'forage':
                        eventMainContext.beginPath(); eventMainContext.strokeStyle = '#aaaaaa';
                        for(var i = 0; i < 3; i++) {
                            switch(Math.floor(Math.random()*4)) {
                                case 0: eventMainContext.moveTo(0,Math.floor(Math.random()*200)); break;
                                case 1: eventMainContext.moveTo(299,Math.floor(Math.random()*200)); break;
                                case 2: eventMainContext.moveTo(Math.floor(Math.random()*300),0); break;
                                case 3: eventMainContext.moveTo(Math.floor(Math.random()*300),199); break;
                            }
                            eventMainContext.lineTo(event.targetX,event.targetY); 
                        }
                        eventMainContext.stroke();
                        eventMainContext.clearRect(50,20,200,160);
                        break;
                }
            },
            alignCanvases: function() {
                var eventOffset = { top: 330, left: 0 };
                jQuery(eventLowCanvas).offset(eventOffset);
                jQuery(eventMainCanvas).offset(eventOffset);
                jQuery(eventHighCanvas).offset(eventOffset);
            },
            eventHighCanvas: jQuery(eventHighCanvas)
        }
});