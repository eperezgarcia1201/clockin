/*Sticky NavAprode Secondary*/
var navbarVisible = false;

        $(window).scroll(function(){

            var ht = $('header').height()+800;

            if ($(this).scrollTop() >= ht) {

                if (!navbarVisible) {
                    $("#navBarStickyAprode").addClass("navbar-fixed-top")
                        .hide()
                        .fadeTo('slow','1');

                    $(".row:first").css("padding-top","50px");
                    navbarVisible = true;
                };
            } else {
                $("#navBarStickyAprode").removeClass("navbar-fixed-top").removeAttr('style');
                $(".row:first").css("padding-top","0px");
                navbarVisible = false;
            }

        });
/*====================================
=            Off canvas Navbar Aprode    =
====================================*/
$(function() {
  $('.toggle-nav').click(function() {
    // Calling a function in case you want to expand upon this.
    toggleNav();
  });
});


/*========================================
=            CUSTOM FUNCTIONS            =
========================================*/
function toggleNav() {
if ($('#site-wrapper').hasClass('show-nav')) {
  // Do things on Nav Close
  $('#site-wrapper').removeClass('show-nav');
} else {
  // Do things on Nav Open
  $('#site-wrapper').addClass('show-nav');
}

//$('#site-wrapper').toggleClass('show-nav');
}





// usage: log('inside coolFunc', this, arguments);
// paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
window.log = function f(){ log.history = log.history || []; log.history.push(arguments); if(this.console) { var args = arguments, newarr; args.callee = args.callee.caller; newarr = [].slice.call(args); if (typeof console.log === 'object') log.apply.call(console.log, console, newarr); else console.log.apply(console, newarr);}};

// make it safe to use console.log always
(function(a){function b(){}for(var c="assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,time,timeEnd,trace,warn".split(","),d;!!(d=c.pop());){a[d]=a[d]||b;}})
(function(){try{console.log();return window.console;}catch(a){return (window.console={});}}());


// place any jQuery/helper plugins in here, instead of separate, slower script files.

$(document).ready(function () {
  $('[data-toggle="offcanvas"]').click(function () {
    $('.row-offcanvas').toggleClass('active')
  });
});

/*Snippet for lines and grid animation on NavBar*/
 var anchor = document.querySelectorAll('button');
    
    [].forEach.call(anchor, function(anchor){
      var open = false;
      anchor.onclick = function(event){
        event.preventDefault();
        if(!open){
          this.classList.add('close');
          open = true;
        }
        else{
          this.classList.remove('close');
          open = false;
        }
      }
    }); 
 /*Carousels styles Bootstrap*/
 $('#carousel-aprode').carousel({
  interval: 5000
});
// Carousel Auto-Cycle
  $(document).ready(function() {
    $('.carousel').carousel({
      interval: 6000
    })
  });

		