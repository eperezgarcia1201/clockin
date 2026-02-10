
<nav class="navbar navbar-default navbar-inverse navbar-fixed-top">
  <div class="container-fluid">
    <!-- Brand and toggle get grouped for better mobile display -->
    <div class="navbar-header">
      <button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#bs-example-navbar-collapse-1" aria-expanded="false">
        <span class="sr-only">Toggle navigation</span>
        <span class="icon-bar"></span>
        <span class="icon-bar"></span>
        <span class="icon-bar"></span>
      </button>
      <a class="navbar-brand" href='index.php'><img style="max-width:200px; margin-top: -7px;" src="images/logos/logo.png" alt="logo"></a>
    </div>

    <!-- Collect the nav links, forms, and other content for toggling -->
    <div class="collapse navbar-collapse" id="bs-example-navbar-collapse-1">
      <ul class="nav navbar-nav navbar-right">

        <li><a href='login.php'><img class="icons" src='images/icons/bricks.png'>
        Administration&nbsp;&nbsp;</a></li>
        <li><a href='login_reports.php'><img class="icons"  src='images/icons/report.png'>Reports&nbsp;&nbsp;</a></li>
        <li class="icons"><a href='punchclock/menu.php'><img   src='images/icons/time.png'>Punchclock&nbsp;&nbsp;</a></li>
        <?php if (isset($_SESSION['valid_user'])) {
    $logged_in_user = $_SESSION['valid_user'];
    echo "    <li><a><img src='images/icons/user_suit.png' border='0'>logged in as: $logged_in_user</li></a>";
} else if (isset($_SESSION['time_admin_valid_user'])) {
    $logged_in_user = $_SESSION['time_admin_valid_user'];
 echo "    <li><a><img src='images/icons/user_suit.png' border='0'>logged in as: $logged_in_user</li></a>";
} else if (isset($_SESSION['valid_reports_user'])) {
    $logged_in_user = $_SESSION['valid_reports_user'];
    echo "    <li><a><img src='images/icons/user_suit.png' border='0'>logged in as: $logged_in_user</li></a>";
}
if ((isset($_SESSION['valid_user'])) || (isset($_SESSION['valid_reports_user'])) || (isset($_SESSION['time_admin_valid_user']))) {
    echo "    <li><a href='logout.php'><img src='images/icons/arrow_rotate_clockwise.png'>Logout&nbsp;&nbsp;</a></li>";
}
?>
      </ul>
    </div><!-- /.navbar-collapse -->
  </div><!-- /.container-fluid -->
</nav>
<?php


// display the logo in top left of each page. This will be $logo you setup in config.inc.php. //
// It will also link you back to your index page. //

/*if ($logo == "none") {
    echo "    <td height=35 align=left></td>\n";
} else {
    echo "<td align=left><a href='index.php'><img border=0 src='$logo'></a></td>\n";
}*/

// if db is out of date, report it here //

if (($dbexists <> "1") || (@$my_dbversion <> $dbversion)) {
    echo "    <td no class=notprint valign=middle align=left style='font-size:13;font-weight:bold;color:#AA0000'><p>***Your database is out of date.***<br />
                                                                                    &nbsp;&nbsp;&nbsp;Upgrade it via the admin section.</p></td>\n";
}

// display a 'reset cookie' message if $use_client_tz = "yes" //

if ($date_link == "none") {

    if ($use_client_tz == "yes") {
       //This is going to be a bootstrap style for the message on top for the reset time zone
	    echo "    <td class=notprint valign=middle align=right style='font-size:9px;'>
              <p>If the times below appear to be an hour off, click <a href='resetcookie.php' style='font-size:9px;'>here</a> to reset.<br />
                If that doesn't work, restart your web browser and reset again.</p></td>\n";
    }

    echo "    <td colspan=2 scope=col align=right valign=middle><a style='color:#000000;font-family:Tahoma;font-size:10pt;text-decoration:none;'>";

} else {

    if ($use_client_tz == "yes") {
        echo "    <td class=notprint valign=middle align=right style='font-size:9px;'>
              <p>If the times below appear to be an hour off, click <a href='resetcookie.php' style='font-size:9px;'>here</a> to reset.<br />
                If that doesn't work, restart your web browser and reset again.</p></td>\n";
    }

    echo "    <td colspan=2 scope=col align=right valign=middle><a href='$date_link' style='color:#000000;font-family:Tahoma;font-size:10pt;
            text-decoration:none;'>";
}

// display today's date in top right of each page. This will link to $date_link you setup in config.inc.php. //
date_default_timezone_set('UTC');
$todaydate = date("F,j Y");
echo "&nbsp;&nbsp;</a></td></tr>\n";
echo "</table>\n";
// display the topbar BOOTSTRAP TOP BAR NAVIGATION INCLUDED //





echo "</div>";
?>
