
$(document).ready(function () {
    // https://momentjscom.readthedocs.io/en/latest/moment/04-displaying/01-format/
    console.log(moment().format("YYYY-MM-DD" + "T" + "hh:mm:ss"));
    // Needs to be global for use in google places fxn
    var restaurantNameGlobal = "";
    // Modal function needed by Materialize
    $('.modal').modal();
    $("#modal2").modal("open");

    // Parallex call needed by Materialize
    $('.parallax').parallax();


    // $('.tap-target').tapTarget("open");
    // Prints default page to screen on page load
    function defaultPage() {
        $(".resultsDiv").hide();
    };
    defaultPage();
    // Function run when the user hits submit
    $("#submitBtn").on("click", function () {
        var restaurantName = $("#rest-search-input").val().trim();
        restaurantNameGlobal = restaurantName;
        // Validate Input
        validateInput(restaurantName);
    });
    // Function validates user input and if valid, calls Fxn to run API, else prompts user to retry
    function validateInput(restaurantName) {
        if (restaurantName == "") {
            Materialize.toast("Please enter a Restaurant Name!", 4000);
        } else {
            // Empty Search Fields and Results for next search
            $("#passTableBody").empty();
            $("#failTableBody").empty();
            $("#rest-search-input").val("");
            chicagoCall(restaurantName);
        };
    };
    // Call City of Chicago Health Data API
    function chicagoCall(restaurantName) {
        var currentMoment = moment().format("YYYY-MM-DD" + "T" + "hh:mm:ss")
        var baseURL = 'https://data.cityofchicago.org/resource/cwig-ma7x.json';
        var queryURL = '?$where=inspection_date between "2016-01-01T12:00:00" and "' + currentMoment + '"' +
            ' and starts_with(dba_name, upper("' +
            restaurantName +
            '"))';
        console.log(queryURL);
        var finalURL = baseURL + queryURL;
        $.getJSON(finalURL, function (r) {
            // Check # of restaurants returned
            lengthCheck(r);
        });
    };
    // This function checks how many restaurants are returned by the City API, if there are multiple, it prompts
    // the user to select the restaurant they want. 
    function lengthCheck(r) {
        // If JSON object is empty, no restaurants were found
        if (r.length == 0) {
            Materialize.toast("No Restaurants by that name were found in that area!", 4000);
        }
        // If JSON object is not empty, find out how many unique restaurants are in the response.
        else {
            var licenseArray = [];
            var multiRestaurantArray = [];
            for (var i = 0; i < r.length; i++) {
                if (!licenseArray.includes(r[i].license_)) {
                    licenseArray.push(r[i].license_);
                    multiRestaurantArray.push({
                        license: r[i].license_,
                        address: r[i].address,
                        name: r[i].dba_name,
                        latitude: r[i].latitude,
                        longitude: r[i].longitude,
                        zip: r[i].zip
                    });
                };
            };
            if (licenseArray.length == 1) {
                addResultsToPage(r);
            } else if (licenseArray.length > 1) {
                $("#multipleLocationsModal").html("");
                userPickRestaurant(multiRestaurantArray, r);
            };
        };
    };
    // Function which prints multiple restaurants to the page and allows user to choose
    function userPickRestaurant(multiRestaurantArray, r) {
        var multipleLocationsModal = $("#multipleLocationsModal");
        for (var i = 0; i < multiRestaurantArray.length; i++) {
            var link = $("<a>");
            link.text(multiRestaurantArray[i].address);
            link.addClass("collection-item collection-item2 multipleResults");
            link.attr("data-license", multiRestaurantArray[i].license);
            multipleLocationsModal.append(link);
            $("#modal1").modal('open');
        };
        // On click listener
        $(".multipleResults").on("click", function () {
            var licenseSelection = $(this).attr("data-license");
            var selectedResponse = [];
            for (var i = 0; i < r.length; i++) {
                if (licenseSelection == r[i].license_) {
                    selectedResponse.push(r[i]);
                };
            };
            $("#modal1").modal('close');
            addResultsToPage(selectedResponse);
        });
    };
    // Function prints results to page after all validation and checking.
    function addResultsToPage(r) {
        initMap(r);
        // placeID(r);
        var pass = 0;
        var fail = 0;
        console.log(r);
        for (var i = 0; i < r.length; i++) {
            var result = r[i].results;
            if (result.includes("Pass")) {
                pass++
                var passTableRow = $("<tr>");
                var tableData1 = $("<td>");
                var tableData2 = $("<td>");
                var tableData3 = $("<td>");
                var tableData4 = $('<td>');
                tableData1.text(moment(r[i].inspection_date).format("MM-DD-YYYY"));
                tableData2.text(r[i].results);
                tableData3.text(r[i].inspection_type);
                // Instead of displaying the violation, reward Restaurants' passed inspections by hiding the inspection data.
                // tableData4.text(r[i].violations);
                // if they passed with "pass" they get a two clean thumbs up
                if (r[i].results === "Pass") {
                    tableData4.text("Two Clean Thumbs Up!")
                } else {
                    // if they passed with "pass with conditions" they get a "One Clean Thumb Up"
                    tableData4.text("One Clean Thumb Up!")
                }

                var passTableBody = $("#passTableBody");
                passTableRow.append(tableData1, tableData2, tableData3, tableData4);
                passTableBody.append(passTableRow);
                // display the DBA name for the header of the map. 
                $("#rName").text(r[i].aka_name);
            } else if (result.includes("Fail")) {
                fail++;
                console.log(fail);
                var failTableRow = $("<tr>");
                var failTableBody = $("#failTableBody");
                var tableData1 = $("<td>");
                var tableData2 = $("<td>");
                var tableData3 = $("<td>");
                var tableData4 = $('<td class="tst">');
                tableData1.text(moment(r[i].inspection_date).format("MM-DD-YYYY"));
                tableData2.text(r[i].results);
                tableData3.text(r[i].inspection_type);
                tableData4.text(r[i].violations);
                failTableRow.append(tableData1, tableData2, tableData3, tableData4);
                failTableBody.append(failTableRow);
            } else {
                console.log("There has been an error with this restaurant");
            };
        };
        $("#totalPass").text(pass);
        $("#totalFail").text(fail);
        $(".resultsDiv").show();

    };
    // Function prints map to page
    function initMap(r) {
        let centerMap = {
            lat: r[0].location.coordinates[0],
            lng: r[0].location.coordinates[1]
        };
        console.log(centerMap)


        var map = new google.maps.Map(document.getElementById('map'), {
            zoom: 15,
            center: centerMap
        });
        var marker = new google.maps.Marker({
            position: centerMap,
            map: map
        });

    };
    // At some point we would love to put this back in and set up a Express Node Server in place of a proxy server.
    // Function which queries Google PlaceID to retrieve placeID
    // function placeID(v) {
    //     var baseURL = 'https://maps.googleapis.com/maps/api/place/textsearch/json?key=AIzaSyDHoRALByDMw9kuV4wjKPK22BqM8AahDgo&';
    //     var queryURL = 'query=' + restaurantNameGlobal + '&location=' + v[0].location.coordinates[1] + ',' + v[0].location.coordinates[0] + '&radius=50';
    //     console.log(baseURL + queryURL);
    //     // var proxyURL = 'https://ghastly-eyeballs-78637.herokuapp.com/';
    //     var fullURL = baseURL + queryURL;
    //     $.getJSON(fullURL, function (r) {
    //         if (r.results.length == 0) {
    //             console.log("There is an error with the Google PlaceID Fxn, someone tell Ronak!");
    //         } else {
    //             reviewsCall(r.results[0].place_id);

    //         };
    //     });
    // };

    // function reviewsCall(placeID) {
    //     var baseURL = 'https://maps.googleapis.com/maps/api/place/details/json?key=AIzaSyDHoRALByDMw9kuV4wjKPK22BqM8AahDgo&';
    //     var queryURL = "placeid=" + placeID;
    //     // var proxyURL = 'https://ghastly-eyeballs-78637.herokuapp.com/';
    //     var fullURL = baseURL + queryURL;
    //     $.getJSON(fullURL, function (r) {
    //         $("#rName").text(r.result.name);
    //         $("#address").text(r.result.formatted_address);
    //         $("#phone").text(r.result.formatted_phone_number);
    //         $("#googleRating").text(r.result.rating);
    //         for (var i = 0; i < r.result.opening_hours.weekday_text.length; i++) {
    //             $("#hours" + i).text(r.result.opening_hours.weekday_text[i]);
    //         };
    //         for (var i = 0; i < 3; i++) {
    //             $("#reviewName" + i).text(r.result.reviews[i].author_name);
    //             $("#reviewText" + i).text(r.result.reviews[i].text);
    //             $("#reviewDate" + i).text(r.result.reviews[i].relative_time_description);
    //         };
    //     });
    // };
    // End of Document Ready
});
