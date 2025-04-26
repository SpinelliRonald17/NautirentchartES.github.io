(function ($) {
    "use strict";
    
    // Dropdown on mouse hover
    $(document).ready(function () {
        function toggleNavbarMethod() {
            if ($(window).width() > 992) {
                $('.navbar .dropdown').on('mouseover', function () {
                    $('.dropdown-toggle', this).trigger('click');
                }).on('mouseout', function () {
                    $('.dropdown-toggle', this).trigger('click').blur();
                });
            } else {
                $('.navbar .dropdown').off('mouseover').off('mouseout');
            }
        }
        toggleNavbarMethod();
        $(window).resize(toggleNavbarMethod);
    });
    
     /* --pocicion inicial */
    /* let ubicacionPrincipal = window.pageYOffset;
     let $nav = document.querySelector("nav");*/
     
         /* --evento scroll */
         /*window.addEventListener("scroll", function() {
         /* --muestra la ubicacion cada vez que hagas scroll */
         //console.log(window.pageYOffset);
     
         /* --donde nos encontramos actualmente */
         /*let desplazamientoActual = window.pageYOffset;
     
         /* --condicon para ocultar o mostrar el menu */
         /*if(ubicacionPrincipal >= desplazamientoActual) {
             /* --si es mayor o igual se muesta */
            /* $nav.style.top = "0px";
            /* console.log('Ubicacion Principal')
            /* console.log(ubicacionPrincipal)
             /*console.log('desplazamiento')
             /*console.log(desplazamientoActual)
        /* } else {
             /* --sino lo ocultamos añadiendo un top negativo */
            /* $nav.style.top = "-80px";
             console.log('Ubicacion Principal')
             console.log(ubicacionPrincipal)
             console.log('desplazamiento')
             console.log(desplazamientoActual)
         }
     
         /* --actulizamos la ubicacion principal */
        /* ubicacionPrincipal = desplazamientoActual;
     });*/
         

   
    // Back to top button
    $(window).scroll(function () {
        if ($(this).scrollTop() > 100) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    $('.back-to-top').click(function () {
        $('html, body').animate({scrollTop: 0}, 1500, 'easeInOutExpo');
        return false;
    });



     // Back to top button
     $(window).scroll(function () {
        if ($(this).scrollTop() < 100) {
            $('.navbar').fadeIn('slow');
        } else {
            $('.navbar').fadeOut('slow');
        }
    });
    $('.back-to-top').click(function () {
        $('html, body').animate({scrollTop: 0}, 1500, 'easeInOutExpo');
        return false;
    });

    // Date and time picker
    $('.date').datetimepicker({
        format: 'L'
    });
    $('.time').datetimepicker({
        format: 'LT'
    });


    // Testimonials carousel
    $(".testimonial-carousel").owlCarousel({
        autoplay: true,
        smartSpeed: 1500,
        margin: 30,
        dots: true,
        loop: true,
        center: true,
        responsive: {
            0:{
                items:1
            },
            576:{
                items:1
            },
            768:{
                items:2
            },
            992:{
                items:3
            }
        }
    });
    
})(jQuery);

