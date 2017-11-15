// Document ready Function
$(document).ready(function(){
    // Needs to be global for use in google places fxn
    var restaurantNameGlobal = "";
	// Modal function needed by Materialize
	$('.modal').modal();
	// Prints default page to screen on page load
	function defaultPage(){
		$(".cuisine-search-field").hide();
		$(".resultsDiv").hide();
	};
	defaultPage();
	// Function to toggle input fields based on target click
	$("#searchBtns").on("click", function(e){
		if (e.target.id === "restaurantName"){

            $(".rest-search-field").show();
            $(".cuisine-search-field").hide();
        } else {
            $(".cuisine-search-field").show();
            $(".rest-search-field").hide();
        }
	});
	// Function run when the user hits submit
	$("#submitBtn").on("click", function(){
        var restaurantName = $("#rest-search-input").val();
        restaurantNameGlobal = restaurantName;
		var cuisineName = $("#cuisine-search-input").val();
		var zipName = $("#zip-search-input").val();
		// Validate Input
		validateInput(restaurantName, zipName);
	});
	// Function validates user input and if valid, calls Fxn to run API, else prompts user to retry
	function validateInput(restaurantName, zipName){
		if (restaurantName == "" && zipName == ""){
			Materialize.toast("Please enter a Restaurant Name!", 4000);
			Materialize.toast("Please enter a valid five digit zip code!", 4000);
		}
		else if (restaurantName == ""){
			Materialize.toast("Please enter a Restaurant Name!", 4000);
		}
		else if (zipName == "" || !(/(^\d{5}$)/).test(zipName)){
			Materialize.toast("Please enter a valid five digit zip code!", 4000);
		}
		else{
			// Empty Search Fields and Results for next search
			$("#passTableBody").empty();
			$("#failTableBody").empty();
			$("#rest-search-input").val("");
            $("#zip-search-input").val("");
			chicagoCall(restaurantName, zipName);
		};
	};
	// Call City of Chicago Health Data API
	function chicagoCall(restaurantName, zipName){
		var baseURL = 'https://data.cityofchicago.org/resource/cwig-ma7x.json';
		var queryURL= '?$where=inspection_date between "2012-01-01T12:00:00" and "2017-01-14T14:00:00"'
		+ ' and starts_with(dba_name, upper("' 
		+ restaurantName
		+ '")) and zip="' + zipName + '"';
		var finalURL = baseURL + queryURL;
		$.getJSON(finalURL, function(r){
            // Check # of restaurants returned
			lengthCheck(r);
		});
	};
	// This function checks how many restaurants are returned by the City API, if there are multiple, it prompts
	// the user to select the restaurant they want. 
	function lengthCheck(r){
		// If JSON object is empty, no restaurants were found
		if (r.length == 0) {
			Materialize.toast("No Restaurants by that name were found in that area!", 4000);
		}
		// If JSON object is not empty, find out how many unique restaurants are in the response.
		else{
            var licenseArray = [];
            var multiRestaurantArray = [];
			for (var i = 0; i < r.length; i++){
				if (!licenseArray.includes(r[i].license_)) {
                    licenseArray.push(r[i].license_);
                    multiRestaurantArray.push(
                        {
                            license: r[i].license_,
                            address: r[i].address,
                            name: r[i].dba_name,
                            latitude: r[i].latitude,
                            longitude: r[i].longitude,
                            zip: r[i].zip
                        }
                    );
                };
            };
            if (licenseArray.length == 1) {
                addResultsToPage(r);
            }
            else if (licenseArray.length > 1){
                $("#multipleLocationsModal").html("");
                userPickRestaurant(multiRestaurantArray, r);
            };
		};
	};
	// Function which prints multiple restaurants to the page and allows user to choose
    function userPickRestaurant(multiRestaurantArray, r){
        var multipleLocationsModal = $("#multipleLocationsModal");
        for (var i = 0; i < multiRestaurantArray.length; i++){
            var link = $("<a>");
            link.text(multiRestaurantArray[i].address);
            link.addClass("collection-item multipleResults");
            link.attr("data-license", multiRestaurantArray[i].license);
            multipleLocationsModal.append(link);
            $("#modal1").modal('open');
        };
        // On click listener
        $(".multipleResults").on("click", function(){
            var licenseSelection = $(this).attr("data-license");
            var selectedResponse = [];
            for (var i = 0; i < r.length; i++){
                if (licenseSelection == r[i].license_){
                    selectedResponse.push(r[i]);
                };
            };
            $("#modal1").modal('close');
            addResultsToPage(selectedResponse);
        });
    };
    // Function prints results to page after all validation and checking.
    function addResultsToPage(r){
        initMap(r);
        placeID(r);
        var pass = 0;
        var fail = 0;
        console.log(r);
        for (var i = 0; i<r.length; i++){
            var result = r[i].results;
            if (result.includes("Pass")){
                pass++
                var passTableRow = $("<tr>");
                var tableData1 = $("<td>");
                var tableData2 = $("<td>");
                var tableData3 = $("<td>");
                var tableData4 = $('<td>');
                tableData1.text(moment(r[i].inspection_date).format("MM-DD-YYYY"));
                tableData2.text(r[i].results);
                tableData3.text(r[i].inspection_type);
                tableData4.text(r[i].violations);
                var passTableBody = $("#passTableBody");
                passTableRow.append(tableData1, tableData2, tableData3, tableData4);
                passTableBody.append(passTableRow);
            }
            else if (result.includes("Fail")){
                fail++;
                console.log(fail);
                var failTableRow = $("<tr>");
                var failTableBody = $("#failTableBody");
                var tableData1 = $("<td>");
                var tableData2 = $("<td>");
                var tableData3 = $("<td>");
                var tableData4 = $('<td>');
                tableData1.text(moment(r[i].inspection_date).format("MM-DD-YYYY"));
                tableData2.text(r[i].results);
                tableData3.text(r[i].inspection_type);
                tableData4.text(r[i].violations);
                failTableRow.append(tableData1, tableData2, tableData3, tableData4);
                failTableBody.append(failTableRow);
            }
            else {
                console.log("There has been an error with this restaurant");
            };
        };
        $("#totalPass").text(pass);
        $("#totalFail").text(fail);
        $(".resultsDiv").show();
    };
    // Function prints map to page
    function initMap(r){
        var centerMap = {
            lat: r[0].location.coordinates[1],
            lng: r[0].location.coordinates[0]
        };
        var map = new google.maps.Map(document.getElementById('map'), {
            zoom: 15,
            center: centerMap
        });
        var marker = new google.maps.Marker({
            position: centerMap,
            map: map
        });
    };    
    // Function which queries Google PlaceID to retrieve placeID
    function placeID(v){
        var baseURL = 'https://maps.googleapis.com/maps/api/place/textsearch/json?key=AIzaSyDHoRALByDMw9kuV4wjKPK22BqM8AahDgo&';
        var queryURL = 'query=' + restaurantNameGlobal + '&location=' + v[0].location.coordinates[1] + ',' + v[0].location.coordinates[0] + '&radius=50';
        console.log(baseURL + queryURL);
        var proxyURL = 'https://ghastly-eyeballs-78637.herokuapp.com/';
        var fullURL = proxyURL + baseURL + queryURL;
        $.getJSON(fullURL, function(r){
            if (r.results.length == 0) {
                console.log("There is an error with the Google PlaceID Fxn, someone tell Ronak!");
            }
            else{
                reviewsCall(r.results[0].place_id);
            };
        });
    };

    function reviewsCall(placeID){
        var baseURL = 'https://maps.googleapis.com/maps/api/place/details/json?key=AIzaSyDHoRALByDMw9kuV4wjKPK22BqM8AahDgo&';
        var queryURL = "placeid=" + placeID;
        var proxyURL = 'https://ghastly-eyeballs-78637.herokuapp.com/';
        var fullURL = proxyURL + baseURL + queryURL;
        $.getJSON(fullURL, function(r){
            $("#rName").text(r.result.name);
            $("#address").text(r.result.formatted_address);
            $("#phone").text(r.result.formatted_phone_number);
            $("#googleRating").text(r.result.rating);
            for (var i = 0; i < r.result.opening_hours.weekday_text.length; i++){
                $("#hours" + i).text(r.result.opening_hours.weekday_text[i]);
            };
            for (var i = 0; i < 3; i++){
                $("#reviewName" + i).text(r.result.reviews[i].author_name);
                $("#reviewText" + i).text(r.result.reviews[i].text);
                $("#reviewDate" + i).text(r.result.reviews[i].relative_time_description);
            };
        });
    };
// End of Document Ready
});