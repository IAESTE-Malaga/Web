/**
 * Added or define custom $ taks in this file
 *
 * @package Scholarship
 *
 * Distributed under the MIT license - http://opensource.org/licenses/MIT
 */

jQuery(document).ready(function($) {
    "use strict";
    
    /**
     * Homepage slider
     */
    var slideAuto = $('.scholarship-slider-wrapper').data('auto');
    var slideMode = $('.scholarship-slider-wrapper').data('mode');
    var slidePager = $('.scholarship-slider-wrapper').data('pager');
    var slideControl = $('.scholarship-slider-wrapper').data('control');
    var slideSpeed = $('.scholarship-slider-wrapper').data('speed');
    var slidePause = $('.scholarship-slider-wrapper').data('pause');

    $('.homepage-slider').lightSlider({
        adaptiveHeight:true,
        item:1,
        slideMargin:0,
        pager: slidePager,
        controls: slideControl,
        loop: true,
        auto: slideAuto,
        mode: slideMode,
        speed: slideSpeed,
        pause: slidePause,
        enableTouch: false,
        enableDrag: false,
        onSliderLoad: function() {
            $('.homepage-slider').removeClass('cS-hidden');
        }
    });

    /**
     * Testimonials slider
     */
    $('.testimonials-slider').each(function() {
        var dataItem = $(this).data('item');
        $('.testimonialsSlider').lightSlider({
            adaptiveHeight:true,
            item: dataItem,
            slideMargin: 30,
            loop: true,
            enableDrag: false,
            controls: false,
            pager: true,
            auto: false,
            speed: 700,
            pause: 4200,
            onSliderLoad: function() {
                $('.testimonialsSlider').removeClass('cS-hidden');
            },
            responsive : [
                    {
                        breakpoint:840,
                        settings: {
                            item:1,
                            slideMove:1,
                            slideMargin:6,
                          }
                    },
                    {
                        breakpoint:600,
                        settings: {
                            item:1,
                            slideMove:1,
                          }
                    }
                ]
        });
    });

    /**
     * sponsor carousel
     */
    $('.sponsor-carousel').each(function() {
        $('.sponsorSlider').lightSlider({
            item: 5,
            pager: false,
            controls: false,
            loop: true,
            auto: true,
            slideMove: 1,
            slideMargin:40,
            speed: 1000,
            pause: 4200,
            enableTouch: false,
            enableDrag: false,
            prevHtml: '<i class="fa fa-angle-left"></i>',
            nextHtml: '<i class="fa fa-angle-right"></i>',
            onSliderLoad: function() {
                $('.sponsorSlider').removeClass('cS-hidden');
            },
            responsive : [
                {
                    breakpoint:800,
                    settings: {
                        item:3,
                        slideMove:1,
                        slideMargin:6,
                      }
                },
                {
                    breakpoint:480,
                    settings: {
                        item:2,
                        slideMove:1
                      }
                }
            ]
        });
    });

    /**
     * team carousel
     */
    $('.team-carousel').each(function() {
        $('.teamSlider').lightSlider({
            item: 4,
            pager: true,
            controls: false,
            auto:true,
            loop: true,
            slideMove: 1,
            slideMargin:30,
            speed: 600,
            enableTouch: false,
            enableDrag: false,
            onSliderLoad: function() {
                $('.teamSlider').removeClass('cS-hidden');
            },
            responsive : [
                {
                    breakpoint:800,
                    settings: {
                        item:3,
                        slideMove:1,
                        slideMargin:6,
                      }
                },
                {
                    breakpoint:600,
                    settings: {
                        item:2,
                        slideMove:1,
                        slideMargin:6,
                      }
                },
                {
                    breakpoint:480,
                    settings: {
                        item:1,
                        slideMove:1
                      }
                }
            ]
        });
    });
    
    /**
     * Scroll To Top
     */
    $(window).scroll(function() {
        if ($(this).scrollTop() > 1000) { 
            $('#mt-scrollup').fadeIn('slow');
        } else {
            $('#mt-scrollup').fadeOut('slow');
        }
    });

    $('#mt-scrollup').click(function() {
        $("html, body").animate({
            scrollTop: 0
        }, 600);
        return false;
    });
    
    /**
     * toggle-menu
     */
    $('.menu-toggle').click(function(event) {
        $('#primary-menu').slideToggle('slow');
    });
    
    /**
     * responsive sub menu toggle
     */
    $('#site-navigation .menu-item-has-children').append('<span class="sub-toggle"> <i class="fa fa-angle-right"></i> </span>');
    $('#site-navigation .page_item_has_children').append('<span class="sub-toggle"> <i class="fa fa-angle-right"></i> </span>');
    

    $('#site-navigation .menu-item-has-children .sub-toggle').click(function() {
        $(this).parent('.menu-item-has-children').children('ul.sub-menu').first().slideToggle('1000');
        $(this).children('.fa-angle-right').first().toggleClass('fa-angle-down');
    });

    $('#site-navigation .page_item_has_children .sub-toggle').click(function() {
        $(this).parent('.page_item_has_children').children('ul.children').first().slideToggle('1000');
        $(this).children('.fa-angle-right').first().toggleClass('fa-angle-down');
    });
    
    /**
     * home page search
     */
    $('.header-search-wrapper .search-main').click(function() {
        $('.header-search-wrapper .search-form-main').toggleClass('search-activate');
    });

    /**
     * Preloader
     */
    if($('#preloader-background').length > 0) {
        $('#preloader-background').fadeOut(200);
    }

    /**
     * Settings about WOW animation
     */
    var WowOptionVal = WowOption.mode;
    if( WowOption.mode == 'show' && $('body').hasClass('home') ) {
        new WOW().init();
    }

    /**
     * Show image on Lightbox for default gallery
     */
    $("a[rel^='prettyPhoto']").prettyPhoto({
        show_title: false,
        deeplinking: false,
        social_tools: ''
    });

    /**
     * Video background
     */
    var mtPlayer;
    mtPlayer = $('.bg-video').YTPlayer({
        containment:'#videoCta',
        showControls:false, 
        loop:true, 
        mute:true, 
        opacity:1, 
        startAt:0,
        quality:'default',
        showYTLogo: false
    });

    /**
     * Portfolio filter
     */
    $('.portfolio-posts-wrapper').imagesLoaded( function() {
        $('.portfolio-posts-wrapper').isotope({ 
            filter: '*',
            itemSelector: '.isotope-item',
            layoutMode: 'fitRows',
            animationOptions: {
                duration: 750,
                easing: 'liniar',
                queue: false,
            }
        }); 

        $('.portfolio-filter a').click(function(e){
            e.preventDefault();
            var selector = $(this).attr('data-filter');
            $('.portfolio-filter li').removeClass('active');
            $(this).parent().addClass('active');            
            $('.portfolio-posts-wrapper').isotope({ 
                filter: selector,
                layoutMode: 'fitRows',
                animationOptions: {
                    duration: 750,
                    easing: 'liniar',
                    queue: false,
                } 
            }); 
          return false; 
        });
    });

    /**
     * Static Counter
     */
    $('.single-count').counterUp({
        delay: 10,
        time: 1000
    });
    
});