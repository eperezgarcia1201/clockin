-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Feb 09, 2026 at 02:43 PM
-- Server version: 5.7.23-23
-- PHP Version: 8.1.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `mayaofde_timeclock`
--

-- --------------------------------------------------------

--
-- Table structure for table `audit`
--

CREATE TABLE `audit` (
  `modified_by_ip` varchar(39) NOT NULL DEFAULT '',
  `modified_by_user` varchar(50) NOT NULL DEFAULT '',
  `modified_when` bigint(14) NOT NULL,
  `modified_from` bigint(14) NOT NULL,
  `modified_to` bigint(14) NOT NULL,
  `modified_why` varchar(250) NOT NULL DEFAULT '',
  `user_modified` varchar(50) NOT NULL DEFAULT ''
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `dbversion`
--

CREATE TABLE `dbversion` (
  `dbversion` decimal(5,1) NOT NULL DEFAULT '0.0'
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

--
-- Dumping data for table `dbversion`
--

INSERT INTO `dbversion` (`dbversion`) VALUES
(1.4);

-- --------------------------------------------------------

--
-- Table structure for table `employees`
--

CREATE TABLE `employees` (
  `empfullname` varchar(50) NOT NULL DEFAULT '',
  `tstamp` bigint(14) DEFAULT NULL,
  `employee_passwd` varchar(25) NOT NULL DEFAULT '',
  `displayname` varchar(50) NOT NULL DEFAULT '',
  `email` varchar(75) NOT NULL DEFAULT '',
  `groups` varchar(50) NOT NULL DEFAULT '',
  `office` varchar(50) NOT NULL DEFAULT '',
  `admin` tinyint(1) NOT NULL DEFAULT '0',
  `reports` tinyint(1) NOT NULL DEFAULT '0',
  `time_admin` tinyint(1) NOT NULL DEFAULT '0',
  `disabled` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

--
-- Dumping data for table `employees`
--

INSERT INTO `employees` (`empfullname`, `tstamp`, `employee_passwd`, `displayname`, `email`, `groups`, `office`, `admin`, `reports`, `time_admin`, `disabled`) VALUES
('Elmer ', 1473385732, 'xynhyrsnDvkYw', 'Server ', 'Admin@loc.com', 'MANAGERS', 'MAYA OF DE PERE', 0, 0, 0, 0),
('Test employee ', 1473384891, 'xyNuGzVs9aAi.', 'Test ', 'admin@localhost.com', 'SERVERS', 'MAYA OF DE PERE', 0, 0, 0, 0);

-- --------------------------------------------------------

--
-- Table structure for table `groups`
--

CREATE TABLE `groups` (
  `groupname` varchar(50) NOT NULL DEFAULT '',
  `groupid` int(10) NOT NULL,
  `officeid` int(10) NOT NULL DEFAULT '0'
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

--
-- Dumping data for table `groups`
--

INSERT INTO `groups` (`groupname`, `groupid`, `officeid`) VALUES
('COOKS', 1, 1),
('SERVERS', 2, 1),
('MANAGERS', 3, 1);

-- --------------------------------------------------------

--
-- Table structure for table `info`
--

CREATE TABLE `info` (
  `fullname` varchar(50) NOT NULL DEFAULT '',
  `inout` varchar(50) NOT NULL DEFAULT '',
  `timestamp` bigint(14) DEFAULT NULL,
  `notes` varchar(250) DEFAULT NULL,
  `ipaddress` varchar(39) NOT NULL DEFAULT ''
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

--
-- Dumping data for table `info`
--

INSERT INTO `info` (`fullname`, `inout`, `timestamp`, `notes`, `ipaddress`) VALUES
('Test employee', 'out', 1473384891, '', '66.87.76.64'),
('Test employee', 'in', 1473381025, '', '66.87.76.64'),
('Test employee', 'in', 1473380755, '', '66.87.76.64'),
('Test employee', 'break', 1473380793, 'voy a salir solo una hora ', '66.87.76.64'),
('Elmer', 'in', 1473385102, '', '66.87.76.64'),
('Elmer', 'out', 1473385249, '', '66.87.76.64'),
('Elmer', 'in', 1473385732, '', '45.52.149.31');

-- --------------------------------------------------------

--
-- Table structure for table `metars`
--

CREATE TABLE `metars` (
  `metar` varchar(255) NOT NULL DEFAULT '',
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `station` varchar(4) NOT NULL DEFAULT ''
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

--
-- Dumping data for table `metars`
--

INSERT INTO `metars` (`metar`, `timestamp`, `station`) VALUES
('', '2016-09-09 03:06:00', 'CYYT');

-- --------------------------------------------------------

--
-- Table structure for table `offices`
--

CREATE TABLE `offices` (
  `officename` varchar(50) NOT NULL DEFAULT '',
  `officeid` int(10) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

--
-- Dumping data for table `offices`
--

INSERT INTO `offices` (`officename`, `officeid`) VALUES
('MAYA OF DE PERE', 1);

-- --------------------------------------------------------

--
-- Table structure for table `punchlist`
--

CREATE TABLE `punchlist` (
  `punchitems` varchar(50) NOT NULL DEFAULT '',
  `color` varchar(7) NOT NULL DEFAULT '',
  `in_or_out` tinyint(1) DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

--
-- Dumping data for table `punchlist`
--

INSERT INTO `punchlist` (`punchitems`, `color`, `in_or_out`) VALUES
('in', '#009900', 1),
('out', '#FF0000', 0),
('break', '#FF9900', 0),
('lunch', '#0000FF', 0);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `audit`
--
ALTER TABLE `audit`
  ADD PRIMARY KEY (`modified_when`),
  ADD UNIQUE KEY `modified_when` (`modified_when`);

--
-- Indexes for table `dbversion`
--
ALTER TABLE `dbversion`
  ADD PRIMARY KEY (`dbversion`);

--
-- Indexes for table `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`empfullname`);

--
-- Indexes for table `groups`
--
ALTER TABLE `groups`
  ADD PRIMARY KEY (`groupid`);

--
-- Indexes for table `info`
--
ALTER TABLE `info`
  ADD KEY `fullname` (`fullname`);

--
-- Indexes for table `metars`
--
ALTER TABLE `metars`
  ADD PRIMARY KEY (`station`),
  ADD UNIQUE KEY `station` (`station`);

--
-- Indexes for table `offices`
--
ALTER TABLE `offices`
  ADD PRIMARY KEY (`officeid`);

--
-- Indexes for table `punchlist`
--
ALTER TABLE `punchlist`
  ADD PRIMARY KEY (`punchitems`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `groups`
--
ALTER TABLE `groups`
  MODIFY `groupid` int(10) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `offices`
--
ALTER TABLE `offices`
  MODIFY `officeid` int(10) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
