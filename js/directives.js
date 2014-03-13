/* Directives and Filters */

angular.module('Geographr.directives', [])
.directive('loginForm', function() {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var userInput = element.find('#inputLoginUser');
            var passInput = element.find('#inputLoginPass');
            var loginButton = element.children('#loginSubmit'); // The log in button
            attrs.$observe('loginForm',function(){
                var status = scope.authStatus;
                if(status == '') { return; }
                userInput.parent().removeClass('has-error');
                passInput.parent().removeClass('has-error');
                switch(status) {
                    case 'notLogged':
                        passInput.val('');
                        break;
                    case 'logged':
                        break;
                    case 'logging':
                        break;
                    case 'badEmail':
                        userInput.focus().parent().addClass('has-error');
                        break;
                    case 'badPass':
                        passInput.focus().parent().addClass('has-error');
                        break;
                }
                if(status == 'badEmail' || status == 'badPass') {
                    if(jQuery.trim(userInput.val()) == '') { // User input blank
                        userInput.parent().addClass('has-error');
                    }
                    if(jQuery.trim(passInput.val()) == '') { // Password input blank
                        passInput.parent().addClass('has-error');
                    }
                }
            });
        }
    };
})
.directive('zoomSlider', function() {
    return {
        restrict: 'C',
        link: function(scope, element) {
            var changeZoom = function() { 
                if(element.val()){ scope.changeZoom(parseInt(element.val())); } 
            };
            element.slider().slider('setValue',scope.zoomLevel).on('slide', changeZoom);
        }
    };
})
.directive('brushSlider', function() {
    return {
        restrict: 'C',
        link: function(scope, element) {
            var changeBrush = function() {
                if(element.val()){ scope.changeBrush(parseInt(element.val())); }
            };
            element.slider().slider('setValue',scope.brushSize).on('slide', changeBrush);
        }
    };
})
.filter('nlToArray', function() {
    return function(text) {
        if(!text) { return text; }
        return text.split('\n');
    };
})
.filter('itemDisplay', function() {
    return function(input) {
        if(!input) { return input; }
        var cellTypes = ['brain','somatic','energy','germ'];
        input = jQuery.inArray(input,cellTypes) >= 0 ? input + ' Cell' : input;
        input = input.charAt(0).toUpperCase() + input.slice(1);
        return input.substring(0,1).toUpperCase()+input.substring(1);
    }
})
.filter('grid', function() {
    return function(input) {
        if(!input) { return input; }
        return input.split(':').join(' , ');
    }
})
.filter('capitalize', function() {
    return function(input, scope) {
        if(!input) { return ''; }
        return input.substring(0,1).toUpperCase()+input.substring(1);
    }
})
.filter('timeUnits', function() {
    return function(input, scope) {
        if(!input) { return 0; }
        var now = new Date().getTime();
        var seconds = Math.floor((now-input)/1000);
        if(seconds < 60) { return seconds; } // seconds
        if(seconds < 3600) { return Math.floor(seconds/60); } // minutes
        if(seconds < 86400) { return Math.floor(seconds/3600); } // hours
        else { return Math.floor(seconds/86400); } // days
    }
})
.filter('timeUnitsLabel', function() {
    return function(input, scope) {
        if(!input) { return ''; }
        var now = new Date().getTime();
        var seconds = Math.floor((now-input)/1000);
        if(seconds < 60) { return seconds > 1 ? 'seconds' : 'second'; } // seconds
        if(seconds < 3600) { return seconds > 119 ? 'minutes' : 'minute'; } // minutes
        if(seconds < 86400) { return seconds > 7199 ? 'hours' : 'hour'; } // hours
        else { return seconds > 172799 ? 'days' : 'day'; } // days
    }
})
.filter('iif', function () {
    return function(input, trueValue, falseValue) {
        return input ? trueValue : falseValue;
    };
})
;