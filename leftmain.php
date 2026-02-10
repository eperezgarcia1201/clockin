<?php

include 'config.inc.php';

$self = $_SERVER['PHP_SELF'];
$request = $_SERVER['REQUEST_METHOD'];

// set cookie if 'Remember Me?' checkbox is checked, or reset cookie if 'Reset Cookie?' is checked //

if ($request == 'POST') {
    @$remember_me = $_POST['remember_me'];
    @$reset_cookie = $_POST['reset_cookie'];
    @$fullname = stripslashes($_POST['left_fullname']);
    @$displayname = stripslashes($_POST['left_displayname']);
    if ((isset($remember_me)) && ($remember_me != '1')) {
        echo "Something is fishy here.\n";
        exit;
    }
    if ((isset($reset_cookie)) && ($reset_cookie != '1')) {
        echo "Something is fishy here.\n";
        exit;
    }

    // begin post validation //

    if ($show_display_name == "yes") {

        if (isset($displayname)) {
            $displayname = addslashes($displayname);
            $query = "select displayname from " . $db_prefix . "employees where displayname = '" . $displayname . "'";
            $emp_name_result = mysql_query($query);

            while ($row = mysql_fetch_array($emp_name_result)) {
                $tmp_displayname = "" . $row['displayname'] . "";
            }
            if ((!isset($tmp_displayname)) && (!empty($displayname))) {
                echo "Username is not in the database.\n";
                exit;
            }
            $displayname = stripslashes($displayname);
        }

    } elseif ($show_display_name == "no") {

        if (isset($fullname)) {
            $fullname = addslashes($fullname);
            $query = "select empfullname from " . $db_prefix . "employees where empfullname = '" . $fullname . "'";
            $emp_name_result = mysql_query($query);

            while ($row = mysql_fetch_array($emp_name_result)) {
                $tmp_empfullname = "" . $row['empfullname'] . "";
            }
            if ((!isset($tmp_empfullname)) && (!empty($fullname))) {
                echo "Username is not in the database.\n";
                exit;
            }
            $fullname = stripslashes($fullname);
        }

    }

    // end post validation //

    if (isset($remember_me)) {

        if ($show_display_name == "yes") {
            setcookie("remember_me", stripslashes($displayname), time() + (60 * 60 * 24 * 365 * 2));
        } elseif ($show_display_name == "no") {
            setcookie("remember_me", stripslashes($fullname), time() + (60 * 60 * 24 * 365 * 2));
        }

    } elseif (isset($reset_cookie)) {
        setcookie("remember_me", "", time() - 3600);
    }

    ob_end_flush();
}

if ($display_weather == 'yes') {

    include 'phpweather.php';
    $metar = get_metar($metar);
    $data = process_metar($metar);

    if ($weather_units == "f") {
        $mph = " mph";
        $miles = " miles";

        // weather info //

        if (!isset($data['temp_f'])) {
            $temp = '';
        } else {
            $temp = $data['temp_f'];
        }
        if (!isset($data['windchill_f'])) {
            $windchill = '';
        } else {
            $windchill = $data['windchill_f'];
        }
        if (!isset($data['wind_dir_text_short'])) {
            $wind_dir = '';
        } else {
            $wind_dir = $data['wind_dir_text_short'];
        }
        if (!isset($data['wind_miles_per_hour'])) {
            $wind = '';
        } else {
            $wind = round($data['wind_miles_per_hour']);
        }
        if ($wind == 0) {
            $wind_dir = 'None';
            $mph = '';
            $wind = '';
        } else {
            $wind_dir = $wind_dir;
        }
        if (!isset($data['visibility_miles'])) {
            $visibility = '';
        } else {
            $visibility = $data['visibility_miles'] . $miles;
        }
        if (!isset($data['rel_humidity'])) {
            $humidity = 'None';
        } else {
            $humidity = round($data['rel_humidity'], 0);
        }
        if (!isset($data['time'])) {
            $time = '';
        } else {
            $time = date($timefmt, $data['time']);
        }
        if (!isset($data['cloud_layer1_condition'])) {
            $cloud_cover = '';
        } else {
            $cloud_cover = $data['cloud_layer1_condition'];
        }
        if (($temp <> '') && ($temp >= '70') && ($humidity <> '')) {
            $heatindex = number_format(-42.379 + (2.04901523 * $temp) + (10.1433312 * $humidity) - (0.22475541 * $temp * $humidity)
                                       - (0.00683783 * ($temp * $temp)) - (0.05481717 * ($humidity * $humidity))
                                       + (0.00122874 * ($temp * $temp) * $humidity) + (0.00085282 * $temp * ($humidity * $humidity))
                                       - (0.00000199 * ($temp * $temp) * ($humidity * $humidity)));
        }
    } else {
        $mph = " kmh";
        $miles = " km";

        // weather info //

        if (!isset($data['temp_c'])) {
            $temp = '';
        } else {
            $temp = $data['temp_c'];
        }
        if (!isset($data['temp_f'])) {
            $tempF = '';
        } else {
            $tempF = $data['temp_f'];
        }
        if (!isset($data['windchill_c'])) {
            $windchill = '';
        } else {
            $windchill = $data['windchill_c'];
        }
        if (!isset($data['wind_dir_text_short'])) {
            $wind_dir = '';
        } else {
            $wind_dir = $data['wind_dir_text_short'];
        }
        if (!isset($data['wind_meters_per_second'])) {
            $wind = '';
        } else {
            $wind = round($data['wind_meters_per_second'] / 1000 * 60 * 60);
        }
        if ($wind == 0) {
            $wind_dir = 'None';
            $mph = '';
            $wind = '';
        } else {
            $wind_dir = $wind_dir;
        }
        if (!isset($data['visibility_km'])) {
            $visibility = '';
        } else {
            $visibility = $data['visibility_km'] . $miles;
        }
        if (!isset($data['rel_humidity'])) {
            $humidity = 'None';
        } else {
            $humidity = round($data['rel_humidity'], 0);
        }
        if (!isset($data['time'])) {
            $time = '';
        } else {
            $time = date($timefmt, $data['time']);
        }
        if (!isset($data['cloud_layer1_condition'])) {
            $cloud_cover = '';
        } else {
            $cloud_cover = $data['cloud_layer1_condition'];
        }
        if (($tempF <> '') && ($tempF >= '70') && ($humidity <> '')) {
            $heatindexF = number_format(-42.379 + (2.04901523 * $tempF) + (10.1433312 * $humidity) - (0.22475541 * $tempF * $humidity)
                                        - (0.00683783 * ($tempF * $tempF)) - (0.05481717 * ($humidity * $humidity))
                                        + (0.00122874 * ($tempF * $tempF) * $humidity) + (0.00085282 * $tempF * ($humidity * $humidity))
                                        - (0.00000199 * ($tempF * $tempF) * ($humidity * $humidity)));
            $heatindex = round(($heatindexF - 32) * 5 / 9);
        }
    }

    if ((isset($heatindex)) || ($windchill <> '')) {
        if (!isset($heatindex)) {
            $feelslike = $windchill;
        } else {
            $feelslike = $heatindex;
        }
    } else {
        $feelslike = $temp;
    }
}

echo "<div>\n";
/*echo "  <tr valign=top>\n";
echo "    <td class=left_main width=170 align=left scope=col>\n";
echo "      <table class=hide width=100% border=0 cellpadding=1 cellspacing=0>\n";*/

// display links in top left of each page //

if ($links == "none") {
    echo "        <tr></tr>\n";
} else {
    echo "        <div></div>\n";

    for ($x = 0; $x < count($display_links); $x++) {
        echo "        <div><a  href='$links[$x]' target='_new'>$display_links[$x]</a></div>";
    }

}

// display form to submit signin/signout information //

echo "       <section id='form-main'>
					<div class='container'> 
						<div class='row'>
						<div class='col-sm-8 col-sm-offset-2'>
					<form class='form-time' name='timeclock' action='$self' method='post'>\n";

if ($links == "none") {

} else {

}

echo "        <p class='lead'>PLEASE SIGN IN BELOW:</p>";
    echo "            <div class='form-group'>";
echo "        <label>NAME:</label>";


// query to populate dropdown with employee names //

if ($show_display_name == "yes") {

    $query = "select displayname from " . $db_prefix . "employees where disabled <> '1'  and empfullname <> 'admin' order by displayname";
    $emp_name_result = mysql_query($query);
    echo "              <select name='left_displayname' class='form-control'>";
    echo "              <option value =''>...</option>\n";

    while ($row = mysql_fetch_array($emp_name_result)) {

        $abc = stripslashes("" . $row['displayname'] . "");

        if ((isset($_COOKIE['remember_me'])) && (stripslashes($_COOKIE['remember_me']) == $abc)) {
            echo "              <option selected>$abc</option>\n";
        } else {
            echo "              <option>$abc</option>\n";
        }

    }

    echo "             </div> </select>";
    mysql_free_result($emp_name_result);
   
} else {

    $query = "select empfullname from " . $db_prefix . "employees where disabled <> '1'  and empfullname <> 'admin' order by empfullname";
    $emp_name_result = mysql_query($query);
    echo "              <select name='left_fullname' class='form-control'>";
    echo "              <option value =''>...</option>\n";
    while ($row = mysql_fetch_array($emp_name_result)) {

        $def = stripslashes("" . $row['empfullname'] . "");
        if ((isset($_COOKIE['remember_me'])) && (stripslashes($_COOKIE['remember_me']) == $def)) {
            echo "              <option selected>$def</option>\n";
        } else {
            echo "              <option>$def</option>\n";
        }

    }

    echo "              </select></div>";
    mysql_free_result($emp_name_result);
}

// determine whether to use encrypted passwords or not //

if ($use_passwd == "yes") {
	echo "    <div class='form-group'>";
    echo "        <label>PASSWORD:</label>";
    echo "<input type='password' class='form-control' name='employee_passwd' >";

}
	echo "</div>";
	echo "    <div class='form-group'>";
echo "        <label>In/Out:</label>";


// query to populate dropdown with punchlist items //

$query = "select punchitems from " . $db_prefix . "punchlist";
$punchlist_result = mysql_query($query);

echo "              <select name='left_inout' class='form-control' >";
echo "              <option value =''>...</option>\n";

while ($row = mysql_fetch_array($punchlist_result)) {
    echo "              <option>" . $row['punchitems'] . "</option>\n";
}

echo "              </div></select>";
mysql_free_result($punchlist_result);


if (!isset($_COOKIE['remember_me'])) {
    echo "            <div class='checkbox'>
                  <label><input type='checkbox' name='remember_me' value='1'>Remember&nbsp;Me?</label>
                    </div>";
} elseif (isset($_COOKIE['remember_me'])) {
    echo "        <div><div>
                  <div>Reset&nbsp;Cookie?</div><div><input type='checkbox' name='reset_cookie' value='1'></div></div>";
}

echo "        <input class='btn btn-medium btn-primary' type='submit' name='submit_button' value='Submit' align='center' 
                tabindex=6>
				</form></div><!--col-sm-8 col-sm-offset-2 -->
				</div><!--row -->
				</div><!-- container -->
				</section><!--form-main-->";

if ($display_weather == "yes") {
  

    if ($humidity == 'None') {
    } else {
    }

  
}



if ($request == 'POST') {

    // signin/signout data passed over from timeclock.php //

    $inout = $_POST['left_inout'];
    $notes = ereg_replace("[^[:alnum:] \,\.\?-]", "", strtolower($_POST['left_notes']));

    // begin post validation //

    if ($use_passwd == "yes") {
        $employee_passwd = crypt($_POST['employee_passwd'], 'xy');
    }

    $query = "select punchitems from " . $db_prefix . "punchlist";
    $punchlist_result = mysql_query($query);

    while ($row = mysql_fetch_array($punchlist_result)) {
        $tmp_inout = "" . $row['punchitems'] . "";
    }

    if (!isset($tmp_inout)) {
        echo "In/Out Status is not in the database.\n";
        exit;
    }

    // end post validation //

    if ($show_display_name == "yes") {

        if (!$displayname && !$inout) {
            echo "<div class='alert alert-danger'>You have not chosen a username or a status. Please try again.</div>";
            include 'footer.php';
            exit;
        }

        if (!$displayname) {
            echo "<div class='alert alert-danger'>You have not chosen a username. Please try again.</div>";
            include 'footer.php';
            exit;
        }

    } elseif ($show_display_name == "no") {

        if (!$fullname && !$inout) {
            echo "<div class='alert alert-danger'>You have not chosen a username or a status. Please try again.</div>";
            include 'footer.php';
            exit;
        }

        if (!$fullname) {
            echo "<div class='alert alert-danger'>You have not chosen a username. Please try again.</div>";
            include 'footer.php';
            exit;
        }

    }

    if (!$inout) {
        echo "<div class='alert alert-danger'>You have not chosen a status. Please try again.</div>";
        include 'footer.php';
        exit;
    }

    @$fullname = addslashes($fullname);
    @$displayname = addslashes($displayname);

    // configure timestamp to insert/update //

    $time = time();
    $hour = gmdate('H', $time);
    $min = gmdate('i', $time);
    $sec = gmdate('s', $time);
    $month = gmdate('m', $time);
    $day = gmdate('d', $time);
    $year = gmdate('Y', $time);
    $tz_stamp = mktime($hour, $min, $sec, $month, $day, $year);

    if ($use_passwd == "no") {

        if ($show_display_name == "yes") {

            $sel_query = "select empfullname from " . $db_prefix . "employees where displayname = '" . $displayname . "'";
            $sel_result = mysql_query($sel_query);

            while ($row = mysql_fetch_array($sel_result)) {
                $fullname = stripslashes("" . $row["empfullname"] . "");
                $fullname = addslashes($fullname);
            }
        }

        if (strtolower($ip_logging) == "yes") {
            $query = "insert into " . $db_prefix . "info (fullname, `inout`, timestamp, notes, ipaddress) values ('" . $fullname . "', '" . $inout . "',
                      '" . $tz_stamp . "', '" . $notes . "', '" . $connecting_ip . "')";
        } else {
            $query = "insert into " . $db_prefix . "info (fullname, `inout`, timestamp, notes) values ('" . $fullname . "', '" . $inout . "', '" . $tz_stamp . "',
                      '" . $notes . "')";
        }

        $result = mysql_query($query);

        $update_query = "update " . $db_prefix . "employees set tstamp = '" . $tz_stamp . "' where empfullname = '" . $fullname . "'";
        $other_result = mysql_query($update_query);

        echo "<head>\n";
        echo "<meta http-equiv='refresh' content=0;url=index.php>\n";
        echo "</head>\n";

    } else {

        if ($show_display_name == "yes") {
            $sel_query = "select empfullname, employee_passwd from " . $db_prefix . "employees where displayname = '" . $displayname . "'";
            $sel_result = mysql_query($sel_query);

            while ($row = mysql_fetch_array($sel_result)) {
                $tmp_password = "" . $row["employee_passwd"] . "";
                $fullname = "" . $row["empfullname"] . "";
            }

            $fullname = stripslashes($fullname);
            $fullname = addslashes($fullname);

        } else {

            $sel_query = "select empfullname, employee_passwd from " . $db_prefix . "employees where empfullname = '" . $fullname . "'";
            $sel_result = mysql_query($sel_query);

            while ($row = mysql_fetch_array($sel_result)) {
                $tmp_password = "" . $row["employee_passwd"] . "";
            }

        }

        if ($employee_passwd == $tmp_password) {

            if (strtolower($ip_logging) == "yes") {
                $query = "insert into " . $db_prefix . "info (fullname, `inout`, timestamp, notes, ipaddress) values ('" . $fullname . "', '" . $inout . "',
                      '" . $tz_stamp . "', '" . $notes . "', '" . $connecting_ip . "')";
            } else {
                $query = "insert into " . $db_prefix . "info (fullname, `inout`, timestamp, notes) values ('" . $fullname . "', '" . $inout . "', '" . $tz_stamp . "',
                      '" . $notes . "')";
            }

            $result = mysql_query($query);

            $update_query = "update " . $db_prefix . "employees set tstamp = '" . $tz_stamp . "' where empfullname = '" . $fullname . "'";
            $other_result = mysql_query($update_query);

            echo "<head>\n";
            echo "<meta http-equiv='refresh' content=0;url=index.php>\n";
            echo "</head>\n";

        } else {

            echo "    <div></div>";

            if ($show_display_name == "yes") {
                $strip_fullname = stripslashes($displayname);
            } else {
                $strip_fullname = stripslashes($fullname);
            }

            echo "<div class='alert alert-danger'>You have entered the wrong password for $strip_fullname. Please try again.</div>";
            include 'footer.php';
            exit;
        }

    }
}
?>
