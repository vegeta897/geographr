/* Directives and Filters */

var sortArrayByProperty = function(arr, sortby, descending) {
    if(arr.length == 0) { return arr; }
    if(arr[0].hasOwnProperty(sortby)) {
        if(descending) {
            arr.sort(function(obj1,obj2) { if(obj1[sortby]<obj2[sortby]) { return 1; } else { return -1; } });
        } else {
            arr.sort(function(obj1,obj2) { if(obj1[sortby]>obj2[sortby]) { return 1; } else { return -1; } });
        }
    }
    return arr;
};

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
.directive('resource', function() {
    return {
        restrict: 'A',
        scope: {
            'resource': '&info' // Don't need this?
        },
        link: function(scope, element) {
            var actions = element.parent().parent().next();
            actions.hide();
            element.on('click',function(e) {
                actions.siblings('.actions').hide(); // Hide other actions panels
                actions.toggle(); // Show actions panel
                e.preventDefault();
            })
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
                if(element.val() == 0){ scope.lockElevation = false; scope.smoothTerrain = false; }
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
        if(!input || !input.hasOwnProperty('type')) { return input; }
        var type = input.type;
        if(input.type == 'userCamp') { type = 'camp'; }
        type = type.substring(0,1).toUpperCase()+type.substring(1); // Capitalize type
        var owner = '', name = '';
        if(input.hasOwnProperty('ownerNick')) { owner = input.ownerNick + '\'s '; }
        if(input.hasOwnProperty('name')) { name = ' ' + 
            input.name.substring(0,1).toUpperCase()+input.name.substring(1); }
        return owner+type+name;
    }
})
.filter('skillLevel', function() {
    return function(input) { if(!input) { return input; } return Math.floor(input / 10); }
})
.filter('typeFilter', function() {
    return function(input,type) {
        if(!input) { return input; }
        var list = [];
        for(var key in input) {
            if(input.hasOwnProperty(key) && input[key].type == type) {
                input[key].name = input[key].name ? input[key].name : key;
                list.push(input[key]);
            }
        }
        list = sortArrayByProperty(list,'name');
        return list;
    }
})
.filter('splitList', function() {
    return function(input,split) {
        if(!input) { return input; }
        var list = [];
        for(var key in input) {
            if(input.hasOwnProperty(key)) {
                input[key].name = key;
                list.push(input[key]);
            }
        }
        list = sortArrayByProperty(list,'name');
        var half = Math.floor(list.length/2);
        return list.splice(0+half*split,half);
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