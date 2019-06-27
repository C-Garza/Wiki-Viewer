$(document).ready(function() {
  let api = "https://en.wikipedia.org/w/api.php?action=query&origin=*"
  let originalWidth = $(window).width();
  let searchTerm = $("#search-term");
  let initParameters = {
    "generator": "search", "format": "json", "gsroffset": "0", 
  }
  let finalParameters = {
    "generator": "search", "format": "json", "gsroffset": "0", "prop": "extracts|info|pageimages",
    "inprop": "url", "list": "search", "srinfo": "totalhits|suggestion", "exlimit": "10", "exintro": "1", "exsentences": "3",
    "piprop": "thumbnail|name", "pithumbsize": "2000", "pilicense": "any", "pilimit": "10"
  }
  let userSearch = "";
  let doContinue = "";
  let pages = {};
  let gsroffset = 0;
  let noResults = "No results found!";
  let resultsCheck = false;
  let imageName = "";
  let imageSrc = "";
  let orderedPages = {};
  let newOrderedPages = {};
  let searchHits = "";
  let resultsIterator = 0;
  let finalEntry = false;
  let currentRequest = null;
  let titles = [];
  let isAnimating = false;
  let suggestion = "";
  ////RESIZES AUTCOMPLETE DROPDOWN
  jQuery.ui.autocomplete.prototype._resizeMenu = function () {
    let ul = this.menu.element;
    ul.outerWidth(searchTerm.outerWidth());
  }
  ////SHOWS THE RESULTS AND SEARCHITS OF THE REQUEST ON THE PAGE
  function showResults(results, iterate) {
    let currentResults = gsroffset + 1;
    let titleURL = "";
    let title = "";
    let pageExtract = "";
    if(resultsCheck) {
      $("#results").prepend("<p class='no-results'>" + noResults + "</p>");
      if(noResults === "No results found!" && finalEntry) {
        moreResultsCheck();
        return;
      }
    }
    for(let page in results) {
      if(iterate) {
        resultsIterator += 1;
      }
      titleURL = results[page].fullurl;
      title = results[page].title;
      pageExtract = results[page].extract;
      if(results[page].hasOwnProperty("thumbnail") === false) {
        imageSrc = "https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg";
        imageName = "No image.";
      }
      else {
        imageSrc = results[page]["thumbnail"].source;
        imageName = results[page].pageimage;
      }
      $("#results").append("<div class='search-result'><a target='_blank' href='"+titleURL+"'><h2>"+title+"</h2><img src='"+imageSrc+"' alt='"+imageName+"'/><p>"+pageExtract+"</p></a></div>");
    }
    if(resultsIterator === 1) {
      $(".search-hits").append("Showing 1 result");
    }
    else {
      if(iterate) {
        $(".search-hits").append("Showing "+ currentResults.toLocaleString() + "-" + resultsIterator + " of " + searchHits + " results");
      }
      else {
        resultsIterator = gsroffset + 10;
        $(".search-hits").append("Showing "+ currentResults.toLocaleString() + "-" + resultsIterator + " of " + searchHits + " results");
      }
    }
    $(".search-result:even").addClass("even");
    $(".search-result:odd").addClass("odd");
    if(iterate) {
      moreResultsCheck();
    }
  }
  ////ORDERS THE RESULTS OF THE REQUEST
  function orderResults(results, titles) {
    let tempArr = [];
    for(let page in pages) {
      tempArr.push([pages[page], pages[page].index]);
    }
    tempArr.sort(function(a, b) {
      return a[1] - b[1];
    });
    for(let page of tempArr) {
      results[String(page[0].index)] = page[0];
    }
    for(let page in results) {
      titles.push(results[page].title);
    }
  }
  ////CHECKS IF ELEMENT IS EMPTY STRING, INCLUDING WHITESPACE
  function isEmpty(el) {
    return !$.trim(el.html());
  }
  ////CHECKS IF THERE IS MORE RESULTS OR LESS RESULTS IN API REQUEST
  function moreResultsCheck() {
    if(isEmpty($("#results")) || gsroffset <= 10) {
      $("#less").hide();
    }
    if (isEmpty($("#results")) || doContinue === undefined) {
      $("#more").hide();
      if(gsroffset >= 10) {
        $("#less").show();
      }
    }
    else {
      $("#more").show();
      if(gsroffset >= 10) {
        $("#less").show();
      }
    }
  }
  moreResultsCheck();
  ////AUTOCOMPLETE FUNCTIONS AND API CALL
  searchTerm.autocomplete({
    source: function(request, response) {
      userSearch = request.term;
      if(finalEntry) {
        finalParameters.gsrsearch = userSearch;
        finalParameters.srsearch = userSearch;
      }
      else {
        initParameters.gsrsearch = userSearch;
      }
      currentRequest = $.ajax({
        url: api,
        datatype: "json",
        data: (finalEntry) ? finalParameters : initParameters,
        beforeSend: function() {
          if(currentRequest != null) {
            currentRequest.abort();
          }
        },
        success: function(data) {
          doContinue = data.continue;
          currentRequest = null;
          if(data.query === undefined) {
            if(finalEntry) {
              searchTerm.autocomplete("search", searchTerm.val().trim());
            }
            $(".search-buttons").css("visibility","visible");
            response("");
          }
          else if(data.query.pages === undefined) {
            if(data.query.searchinfo !== undefined) {
              suggestion = data.query.searchinfo.suggestion;
            }
            $(".search-buttons").css("visibility","visible");
            if(finalEntry && suggestion !== undefined) {
              resultsCheck = true;
              noResults = "No results found! Showing results instead for <span>" + suggestion + "<span>.";
              searchTerm.autocomplete("search", suggestion);
            }
            else if(finalEntry && suggestion === undefined) {
              resultsCheck = true;
              noResults = "No results found!";
              $(".search-icon").click();
              finalEntry = false;
              suggestion = undefined;
              resultsCheck = false;
            }
            response("");
          }
          else {
            pages = data.query.pages;
            titles = [];
            orderedPages = {};
            orderResults(orderedPages, titles);
            if(finalEntry && data.query.searchinfo !== undefined) {
              searchHits = data.query.searchinfo.totalhits.toLocaleString();
              $(".search-icon").click();
              finalEntry = false;
            }
            suggestion = undefined;
            resultsCheck = false;
            response(titles);
          }
        },
        error: function(data, status, error) {
          currentRequest = null;
          response("");
        }
      });
    },
    ////REPOSITIONS AUTOCOMPLETE DROPDOWN
    appendTo: "#menu-length",
    position: {
      my: "right top-4", at: "left bottom", of: ".search-icon"
    },
    open: function() {
      searchTerm.addClass("merge-search")
      $(".search-buttons").css("visibility","hidden");
    },
    ////SETS DELAY FOR AUTOCOMPLETE
    delay: 0,
    ////HANDLES DROPDOWN MENU SELECT
    select: function(event, ui) {
      searchTerm.autocomplete('close').blur();
      finalEntry = true;
      searchTerm.autocomplete("search", ui.item.value);
    },
    }).on('keyup', function (e) {
      if (e.keyCode == 13 && searchTerm.val().trim() !== "") {
        finalEntry = true;
        searchTerm.autocomplete("close").blur();
        searchTerm.autocomplete("search", searchTerm.val().trim());
      }
    });
  ////DETECTS IF AUTOCOMPLETE DROPDOWN IS CLOSED, UNFOCUSES
  searchTerm.on('autocompleteclose', function(event, ui) {
    $(this).data('is_open', false);
    $(".search-buttons").css("visibility","visible");
    searchTerm.removeClass("merge-search");
  });
  ////SEARCH BUTTON FUNCTIONALITY
  $(".wiki-search, .search-icon").click(function(e) {
    if(searchTerm.val().trim() === "") {
      return;
    }
    if(!finalEntry) {
      finalEntry = true;
      searchTerm.autocomplete("search", searchTerm.val().trim());
      return;
    }
    $(this).blur();
    searchTerm.autocomplete("close").blur();
    if(searchTerm.val().trim() !== "") {
      gsroffset = 0;
      ////IF THE PAGE IS EMPTY i.e. ANY RESULTS ON PAGE.
      if(isEmpty($("#results"))) {
        resultsIterator = 0;
        showResults(orderedPages, true);
      }
      ////IF THE PAGE IS NOT EMPTY, EMPTY AND FILL.
      else {
        resultsIterator = 0;
        $(".search-hits").empty();
        $("#results").empty();
        showResults(orderedPages, true);
      }
    }
  });
  ////If MORE RESULTS IS CLICKED
  $("#more").click(function() {
    $('html,body').animate({ scrollTop: 0 }, 600);
    gsroffset += 10;
    $.ajax({
      url: api,
      datatype: "json",
      data: {
        "generator": "search",
        "format": "json",
        "gsrsearch": userSearch,
        "prop": "extracts|info|pageimages",
        "inprop": "url",
        "exlimit": '10',
        "exintro": '1',
        "exsentences": '3',
        "piprop": "thumbnail|name",
        "pithumbsize": "2000",
        "pilicense": "any",
        "pilimit": "10",
        "gsroffset": gsroffset,
      },
      success:function(response) {
        if(!isEmpty($(".no-results"))) {
          resultsCheck = true;
        }
        moreResultsCheck();
        pages = response.query.pages;
        doContinue = response.continue;
        titles = [];
        newOrderedPages = {};
        orderResults(newOrderedPages, titles);
        $("#results").empty();
        $(".search-hits").empty();
        showResults(newOrderedPages, true);
        resultsCheck = false;
    }
    });
  });
  ////IF LESS RESULTS IS CLICKED
  $("#less").click(function() {
    $('html,body').animate({ scrollTop: 0 }, 600);
    gsroffset -= 10;
    $.ajax({
      url: api,
      datatype: "json",
      data: {
        "generator": "search",
        "format": "json",
        "gsrsearch": userSearch,
        "prop": "extracts|info|pageimages",
        "inprop": "url",
        "exlimit": '10',
        "exintro": '1',
        "exsentences": '3',
        "piprop": "thumbnail|name",
        "pithumbsize": "2000",
        "pilicense": "any",
        "pilimit": "10",
        "gsroffset": gsroffset,
      },
      success:function(response) {
        if(!isEmpty($(".no-results"))) {
          resultsCheck = true;
        }
        doContinue = response.continue;
        moreResultsCheck();
        pages = response.query.pages;
        titles = [];
        newOrderedPages = {};
        orderResults(newOrderedPages, titles);
        $("#results").empty();
        $(".search-hits").empty();
        showResults(newOrderedPages, false);
        resultsCheck = false;
    }
    });
  });
  ////DETECTS IF WINDOWSIZE CHANGES AND HIDES DROPDOWN IF IT DOES
  $(window).resize(function() {
    let newWidth = $(window).width();
    if (newWidth !== originalWidth) {
      $(".ui-autocomplete").css("display", "none");
      searchTerm.removeClass("merge-search");
      $(".even, .odd").css("animation-name", "none");
      $(".search-buttons").css("visibility","visible");
      originalWidth = newWidth;
    }
  });
  ////MAKE FOOTER HAVE ANIMATION
  $('footer').on('click', function(e) {
    if(isAnimating) {
      return;
    }
    isAnimating = true;
    $(".footer-about-section, .footer-close").toggleClass("hide");
    if($("footer").hasClass("footer-animate-show")) {
      $("footer").removeClass("footer-animate-show");
      $("footer").addClass("footer-animate-hide");
    }
    else {
      $("footer").removeClass("footer-animate-hide");
      $("footer").addClass("footer-animate-show");
    }
    setTimeout(() => {isAnimating = false}, 300);
  });
});