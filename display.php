<?php

$row_count = 0;
$page_count = 0;

while ($row = mysql_fetch_array($result)) {

    $display_stamp = "" . $row["timestamp"] . "";
    $time = date($timefmt, $display_stamp);
    $date = date($datefmt, $display_stamp);

    if ($row_count == 0) {

        if ($page_count == 0) {

            // display sortable column headings for main page //

            /*echo "           <div class='container'>						";

            if (!isset($_GET['printer_friendly'])) {
                echo "              <div class='pull-right'><a href='timeclock.php?printer_friendly=true'>printer friendly page</a></div></div>";
            }*/

            echo " <section id='employee'>";
            echo "                <div class='container'>
									<div class='row'>																																		                                     <div class='col-xs-2'>Name</div><!--col-xs-->";
            echo "                	 <div class='col-xs-2'>
			In/Out</div><!--col-xs-->";
            echo "                <div class='col-xs-2'>
			Time</div><!--col-xs-->";
            echo "                <div class='col-xs-2'>
			Date</div><!--col-xs-->
			
										";
										

            if ($display_office_name == "yes") {
                echo "                <div class='col-xs-2'>	
			Office
									  </div>";
            }

            if ($display_group_name == "yes") {
                echo "                <div class='col-xs-2'>	
				Group
									  </div>";
				echo "					</section>
										</div><!--row-->
										</div><!--container -->";//Final section for display users
            }

        } else {

            // display report name and page number of printed report above the column headings of each printed page //

            $temp_page_count = $page_count + 1;
        }

      /*  echo "              <tr class=notdisplay>\n";
        echo "                <div>Name</div>\n";
        echo "                <td nowrap width=7% align=left style='padding-left:10px;font-size:11px;color:#27408b;
                            text-decoration:underline;'>In/Out</td>\n";
        echo "                <td nowrap width=5% align=right style='padding-right:10px;font-size:11px;color:#27408b;
                            text-decoration:underline;'>Time</td>\n";
        echo "                <td nowrap width=5% align=right style='padding-left:10px;font-size:11px;color:#27408b;
                            text-decoration:underline;'>Date</td>\n";

        if ($display_office_name == "yes") {
            echo "                <td nowrap width=10% align=left style='padding-left:10px;font-size:11px;color:#27408b;
                                text-decoration:underline;'>Office</td>\n";
        }

        if ($display_group_name == "yes") {
            echo "                <td nowrap width=10% align=left style='padding-left:10px;font-size:11px;color:#27408b;
                                text-decoration:underline;'>Group</td>\n";
        }

        echo "                <td style='padding-left:10px;'><a style='font-size:11px;color:#27408b;text-decoration:underline;'>Notes</td>\n";
        echo "              </tr>\n";*/
    }

    // begin alternating row colors //
echo " <section id='display-phone'>
		<div class='container'>
		<div class='row'>";
    $row_color = ($row_count % 2) ? $color1 : $color2;

    // display the query results //

    $display_stamp = $display_stamp + @$tzo;
    $time = date($timefmt, $display_stamp);
    $date = date($datefmt, $display_stamp);
		
    if ($show_display_name == "yes") {
        echo stripslashes("              <div class='col-sm-2' bgcolor='$row_color' >" . $row["displayname"] . "</div>");
    } elseif ($show_display_name == "no") {
        echo stripslashes("  <div class='col-xs-2'>            " . $row["empfullname"] . "</div>");
    }

    echo "                <div class='col-xs-2' style='color:" . $row["color"] . ";
                        '>" . $row["inout"] . "</div>";
    echo "                <div class='col-xs-2' bgcolor='$row_color' >" . $time . "</div>";
    echo "                <div class='col-xs-2' bgcolor='$row_color' >" . $date . "</div>\n";

    if ($display_office_name == "yes") {
        echo "                <div class='col-xs-2' bgcolor='$row_color' >" . $row["office"] . "</div>";
    }

    if ($display_group_name == "yes") {
        echo "                <div class='col-xs-2' bgcolor='$row_color' >" . $row["groups"] . "</div>\n";
    }

    
    echo "              </tr>\n";

    $row_count++;

    // output 40 rows per printed page //

    if ($row_count == 40) {
        echo "              <tr style=\"page-break-before:always;\"></tr>\n";
        $row_count = 0;
        $page_count++;
    }

}



if (!isset($_GET['printer_friendly'])) {
echo "            </section></div></div>";
}

mysql_free_result($result);
?>
