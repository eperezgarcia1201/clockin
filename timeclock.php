
<?php


include 'config.inc.php';
include 'header.php';

if (!isset($_GET['printer_friendly'])) {

    if (isset($_SESSION['valid_user'])) {
        $set_logout = "1";
    }

    include 'topmain.php';
    include 'leftmain.php';
}

echo "<title>$title</title>\n";
$current_page = "timeclock.php";

if (!isset($_GET['printer_friendly'])) {
    echo "      <div class='container'>";

}

// code to allow sorting by Name, In/Out, Date, Notes //

if ($show_display_name == "yes") {
    if (!isset($_GET['sortcolumn'])) {
        $sortcolumn = "displayname";
    } else {
        $sortcolumn = $_GET['sortcolumn'];
    }

} else {

    if (!isset($_GET['sortcolumn'])) {
        $sortcolumn = "fullname";
    } else {
        $sortcolumn = $_GET['sortcolumn'];
    }

}

if (!isset($_GET['sortdirection'])) {
    $sortdirection = "asc";
} else {
    $sortdirection = $_GET['sortdirection'];
}

if ($sortdirection == "asc") {
    $sortnewdirection = "desc";
} else {
    $sortnewdirection = "asc";
}

// determine what users, office, and/or group will be displayed on main page //

if (($display_current_users == "yes") && ($display_office == "all") && ($display_group == "all")) {
    $current_users_date = strtotime(date($datefmt));
    $calc = 86400;
    $a = $current_users_date + $calc - @$tzo;
    $b = $current_users_date - @$tzo;

    $query = "select " . $db_prefix . "info.*, " . $db_prefix . "employees.*, " . $db_prefix . "punchlist.*
              from " . $db_prefix . "info, " . $db_prefix . "employees, " . $db_prefix . "punchlist
              where " . $db_prefix . "info.timestamp = " . $db_prefix . "employees.tstamp and " . $db_prefix . "info.fullname = " . $db_prefix . "employees.empfullname
              and " . $db_prefix . "info.`inout` = " . $db_prefix . "punchlist.punchitems and ((" . $db_prefix . "info.timestamp < '" . $a . "') and
              (" . $db_prefix . "info.timestamp >= '" . $b . "')) and " . $db_prefix . "employees.disabled <> '1' and " . $db_prefix . "employees.empfullname <> 'admin'
              order by `$sortcolumn` $sortdirection";
    $result = mysql_query($query);
} elseif (($display_current_users == "yes") && ($display_office != "all") && ($display_group == "all")) {

    $current_users_date = strtotime(date($datefmt));
    $calc = 86400;
    $a = $current_users_date + $calc - @$tzo;
    $b = $current_users_date - @$tzo;

    $query = "select " . $db_prefix . "info.*, " . $db_prefix . "employees.*, " . $db_prefix . "punchlist.*
              from " . $db_prefix . "info, " . $db_prefix . "employees, " . $db_prefix . "punchlist
              where " . $db_prefix . "info.timestamp = " . $db_prefix . "employees.tstamp and " . $db_prefix . "info.fullname = " . $db_prefix . "employees.empfullname
              and " . $db_prefix . "info.`inout` = " . $db_prefix . "punchlist.punchitems and " . $db_prefix . "employees.office = '" . $display_office . "'
              and ((" . $db_prefix . "info.timestamp < '" . $a . "') and (" . $db_prefix . "info.timestamp >= '" . $b . "'))
              and " . $db_prefix . "employees.disabled <> '1' and " . $db_prefix . "employees.empfullname <> 'admin'
              order by `$sortcolumn` $sortdirection";
    $result = mysql_query($query);
} elseif (($display_current_users == "yes") && ($display_office == "all") && ($display_group != "all")) {

    $current_users_date = strtotime(date($datefmt));
    $calc = 86400;
    $a = $current_users_date + $calc - @$tzo;
    $b = $current_users_date - @$tzo;

    $query = "select " . $db_prefix . "info.*, " . $db_prefix . "employees.*, " . $db_prefix . "punchlist.*
              from " . $db_prefix . "info, " . $db_prefix . "employees, " . $db_prefix . "punchlist
              where " . $db_prefix . "info.timestamp = " . $db_prefix . "employees.tstamp and " . $db_prefix . "info.fullname = " . $db_prefix . "employees.empfullname
              and " . $db_prefix . "info.`inout` = " . $db_prefix . "punchlist.punchitems and " . $db_prefix . "employees.groups = '" . $display_group . "'
              and ((" . $db_prefix . "info.timestamp < '" . $a . "') and (" . $db_prefix . "info.timestamp >= '" . $b . "'))
              and " . $db_prefix . "employees.disabled <> '1' and " . $db_prefix . "employees.empfullname <> 'admin'
              order by `$sortcolumn` $sortdirection";
    $result = mysql_query($query);
} elseif (($display_current_users == "yes") && ($display_office != "all") && ($display_group != "all")) {

    $current_users_date = strtotime(date($datefmt));
    $calc = 86400;
    $a = $current_users_date + $calc - @$tzo;
    $b = $current_users_date - @$tzo;

    $query = "select " . $db_prefix . "info.*, " . $db_prefix . "employees.*, " . $db_prefix . "punchlist.*
              from " . $db_prefix . "info, " . $db_prefix . "employees, " . $db_prefix . "punchlist
              where " . $db_prefix . "info.timestamp = " . $db_prefix . "employees.tstamp and " . $db_prefix . "info.fullname = " . $db_prefix . "employees.empfullname
              and " . $db_prefix . "info.`inout` = " . $db_prefix . "punchlist.punchitems and " . $db_prefix . "employees.office = '" . $display_office . "'
              and " . $db_prefix . "employees.groups = '" . $display_group . "' and ((" . $db_prefix . "info.timestamp < '" . $a . "')
              and (" . $db_prefix . "info.timestamp >= '" . $b . "')) and " . $db_prefix . "employees.disabled <> '1'
              and " . $db_prefix . "employees.empfullname <> 'admin'
              order by `$sortcolumn` $sortdirection";
    $result = mysql_query($query);
} elseif (($display_current_users == "no") && ($display_office == "all") && ($display_group == "all")) {

    $query = "select " . $db_prefix . "info.*, " . $db_prefix . "employees.*, " . $db_prefix . "punchlist.*
              from " . $db_prefix . "info, " . $db_prefix . "employees, " . $db_prefix . "punchlist
              where " . $db_prefix . "info.timestamp = " . $db_prefix . "employees.tstamp and " . $db_prefix . "info.fullname = " . $db_prefix . "employees.empfullname
              and " . $db_prefix . "info.`inout` = " . $db_prefix . "punchlist.punchitems and " . $db_prefix . "employees.disabled <> '1'
              and " . $db_prefix . "employees.empfullname <> 'admin'
              order by `$sortcolumn` $sortdirection";
    $result = mysql_query($query);
} elseif (($display_current_users == "no") && ($display_office != "all") && ($display_group == "all")) {

    $query = "select " . $db_prefix . "info.*, " . $db_prefix . "employees.*, " . $db_prefix . "punchlist.*
              from " . $db_prefix . "info, " . $db_prefix . "employees, " . $db_prefix . "punchlist
              where " . $db_prefix . "info.timestamp = " . $db_prefix . "employees.tstamp and " . $db_prefix . "info.fullname = " . $db_prefix . "employees.empfullname
              and " . $db_prefix . "info.`inout` = " . $db_prefix . "punchlist.punchitems and " . $db_prefix . "employees.office = '" . $display_office . "'
              and " . $db_prefix . "employees.disabled <> '1' and " . $db_prefix . "employees.empfullname <> 'admin'
              order by `$sortcolumn` $sortdirection";
    $result = mysql_query($query);
} elseif (($display_current_users == "no") && ($display_office == "all") && ($display_group != "all")) {

    $query = "select " . $db_prefix . "info.*, " . $db_prefix . "employees.*, " . $db_prefix . "punchlist.*
              from " . $db_prefix . "info, " . $db_prefix . "employees, " . $db_prefix . "punchlist
              where " . $db_prefix . "info.timestamp = " . $db_prefix . "employees.tstamp and " . $db_prefix . "info.fullname = " . $db_prefix . "employees.empfullname
              and " . $db_prefix . "info.`inout` = " . $db_prefix . "punchlist.punchitems and " . $db_prefix . "employees.groups = '" . $display_group . "'
              and " . $db_prefix . "employees.disabled <> '1' and " . $db_prefix . "employees.empfullname <> 'admin'
              order by `$sortcolumn` $sortdirection";
    $result = mysql_query($query);
} elseif (($display_current_users == "no") && ($display_office != "all") && ($display_group != "all")) {

    $query = "select " . $db_prefix . "info.*, " . $db_prefix . "employees.*, " . $db_prefix . "punchlist.*
              from " . $db_prefix . "info, " . $db_prefix . "employees, " . $db_prefix . "punchlist
              where " . $db_prefix . "info.timestamp = " . $db_prefix . "employees.tstamp and " . $db_prefix . "info.fullname = " . $db_prefix . "employees.empfullname
              and " . $db_prefix . "info.`inout` = " . $db_prefix . "punchlist.punchitems and " . $db_prefix . "employees.office = '" . $display_office . "'
              and " . $db_prefix . "employees.groups = '" . $display_group . "' and " . $db_prefix . "employees.disabled <> '1'
              and " . $db_prefix . "employees.empfullname <> 'admin'
              order by `$sortcolumn` $sortdirection";
    $result = mysql_query($query);
}

$time = time();
$tclock_hour = gmdate('H', $time);
$tclock_min = gmdate('i', $time);
$tclock_sec = gmdate('s', $time);
$tclock_month = gmdate('m', $time);
$tclock_day = gmdate('d', $time);
$tclock_year = gmdate('Y', $time);
date_default_timezone_set('America/chicago');
$tclock_stamp = mktime($tclock_hour, $tclock_min, $tclock_sec, $tclock_month, $tclock_day, $tclock_year);

$tclock_stamp = $tclock_stamp + @$tzo;
$tclock_time = date($timefmt, $tclock_stamp);
$tclock_date = date($datefmt, $tclock_stamp);




if (!isset($_GET['printer_friendly'])) {
    
} else {
    
}

include 'display.php';

if (!isset($_GET['printer_friendly'])) {
    include 'footer.php';
}

?>

