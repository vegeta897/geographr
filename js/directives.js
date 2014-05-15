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
            attrs.$observe('loginForm',function(){
                var status = scope.authStatus;
                if(status == '') { return; }
                userInput.parent().removeClass('has-error');
                passInput.parent().removeClass('has-error');
                switch(status) {
                    case 'notLogged': passInput.val(''); break;
                    case 'badEmail': userInput.focus().parent().addClass('has-error'); break;
                    case 'badPass': passInput.focus().parent().addClass('has-error'); break;
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
.directive('togglePanel', function() {
    return {
        restrict: 'A',
        link: function(scope, element) {
            var actions = element.parent().parent().next('.actions');
            if(actions.hasClass('start-open')) { actions.show(); }
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
.directive('changeEffect', function() {
    return {
        restrict: 'C',
        scope: { model: '=', neutral: '=' },
        link: function(scope, element) {
            var originalShadow = element.css('text-shadow'), originalSize = element.css('font-size');
            scope.$watch('model', function(newVal,oldVal) {
                element.css({'-webkit-transition': 'text-shadow 0s, font-size 0s',
                    transition: 'text-shadow 0s, font-size 0s'});
                var color = newVal > oldVal && !scope.neutral ? 'rgba(0,255,0,255)' : 
                    newVal < oldVal && !scope.neutral ? 'rgba(255,0,0,255)' : 'rgba(255,255,255,255)';
                element.css({textShadow: '0 0 6px ' + color, fontSize: '1.2em'});
                setTimeout(function(){
                    element.css({'-webkit-transition': 'text-shadow 0.8s ease-out, font-size 0.7s ease-out',
                        transition: 'text-shadow 0.8s ease-out, font-size 0.7s ease-out'});
                    element.css({textShadow: originalShadow, fontSize: originalSize});
                    setTimeout(function(){
                        element.css({'-webkit-transition': 'text-shadow 0s, font-size 0s',
                            transition: 'text-shadow 0s, font-size 0s'});
                    },800);
                },10);
            })
        }
    }
})
.filter('int', function() {
    return function(number) {
        if(!number) { return number; }
        return Math.round(number);
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
    return function(input) { if(!input) { return input; } return Math.floor(input / 10) + 1; }
})
.filter('typeFilter', function(gameUtility) {
    return function(input,types) {
        if(!input) { return input; }
        var list = [], inputCopy = angular.copy(input);
        switch(types[0]) {
            case 'edible':
                for(var edKey in input) { if(!input.hasOwnProperty(edKey)) { continue; }
                    if(!gameUtility.edibles.hasOwnProperty(input[edKey].name)) { continue; }
                    if(types[1] != 'auto' || (types[1] == 'auto' && input[edKey].status == 'cooked') 
                        || (types[1] == 'auto' && 
                        !gameUtility.edibles[input[edKey].name].hasOwnProperty('effects'))) {
                        list.push(input[edKey]);
                    }
                }
                break;
            case 'cookable':
                for(var coKey in input) { if(!input.hasOwnProperty(coKey)) { continue; }
                    if(!gameUtility.edibles.hasOwnProperty(input[coKey].name) || 
                        input[coKey].status == 'cooked') { continue; }
                    if(gameUtility.edibles[input[coKey].name].hasOwnProperty('cookedEnergy')) {
                        list.push(input[coKey]);
                    }
                }
                break;
            case 'blacksmith':
                for(var bsKey in input) { if(!input.hasOwnProperty(bsKey)) { continue; }
                    if(input[bsKey].profession == 'blacksmith' && input[bsKey].status == 'unrefined') {
                        list.push(input[bsKey]); }
                }
                break;
            case 'all':
                for(var allKey in input) { if(input.hasOwnProperty(allKey)) { 
                    var allItem = input[allKey]; /*allItem.name = allKey;*/ list.push(input[allKey]); } }
                break;
            default:
                for(var key in input) {
                    if(input.hasOwnProperty(key) && jQuery.inArray(key.split(':')[0],types) >= 0 ) {
                        var item = input[key]; item.key = key; list.push(input[key]);
                    }
                }
                break;
        }
        list = sortArrayByProperty(list,'key');
//        for(var i = 0; i < list.length; i++) {
//            list[i].lastOfType = (i < list.length - 1 && list[i].type != list[i+1].type);
//        }
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
    return function(input) {
        if(!input) { return ''; }
        var words = input.split(' '), result = '';
        for(var i = 0; i < words.length; i++) {
            result += words[i].substring(0,1).toUpperCase()+words[i].substring(1);
            result += i == words.length - 1 ? '' : ' ';
        }
        return result;
    }
})
.filter('left', function() {
    return function(input, chars) { if(!input) { return ''; } return input.substring(0,chars); }
})
.filter('timeUnits', function() {
    return function(input,exact) {
        if(!input) { return 0; }
        var now = new Date().getTime();
        var seconds = Math.floor((now-input)/1000);
        if(seconds < 60 && exact) { return seconds; } // seconds
        if(seconds < 60) { return 0; } // less than a min
        if(seconds < 3600) { return Math.floor(seconds/60); } // minutes
        if(seconds < 86400) { return Math.floor(seconds/3600); } // hours
        else { return Math.floor(seconds/86400); } // days
    }
})
.filter('timeUnitsLabel', function() {
    return function(input,exact) {
        if(!input) { return ''; }
        var now = new Date().getTime();
        var seconds = Math.floor((now-input)/1000);
        if(seconds < 60 && exact) { return seconds > 1 ? 'seconds' : 'second'; } // seconds
        if(seconds < 60) { return 'minutes'; } // less than a min
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