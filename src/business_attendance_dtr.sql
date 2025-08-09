-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Aug 09, 2025 at 09:08 AM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `business_attendance_dtr`
--

-- --------------------------------------------------------

--
-- Table structure for table `attendance_devices`
--

CREATE TABLE `attendance_devices` (
  `id` int(11) NOT NULL,
  `organization_id` int(11) NOT NULL,
  `device_name` varchar(100) NOT NULL,
  `location` varchar(100) NOT NULL,
  `department_id` int(11) DEFAULT NULL,
  `device_type` enum('face_recognition','biometric','mixed') DEFAULT 'face_recognition',
  `ip_address` varchar(45) DEFAULT NULL,
  `mac_address` varchar(17) DEFAULT NULL,
  `status` enum('active','inactive','maintenance') DEFAULT 'active',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `attendance_devices`
--

INSERT INTO `attendance_devices` (`id`, `organization_id`, `device_name`, `location`, `department_id`, `device_type`, `ip_address`, `mac_address`, `status`, `is_active`, `created_at`) VALUES
(1, 1, 'Main Entrance Scanner', 'Main Building Entrance', NULL, 'mixed', '192.168.1.100', '00:1B:44:11:3A:B7', 'active', 1, '2025-08-04 01:01:23');

-- --------------------------------------------------------

--
-- Table structure for table `attendance_logs`
--

CREATE TABLE `attendance_logs` (
  `id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `device_id` int(11) DEFAULT NULL,
  `attendance_type` enum('time_in','time_out','break_out','break_in','overtime_in','overtime_out') NOT NULL,
  `scan_timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `attendance_date` date NOT NULL,
  `status` enum('on_time','late','early_out','overtime','break','absent') DEFAULT 'on_time',
  `verification_method` enum('face_recognition','biometric','manual') NOT NULL,
  `scan_location` varchar(100) DEFAULT NULL,
  `photo_url` varchar(500) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `processed_by` int(11) DEFAULT NULL COMMENT 'For manual entries',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `attendance_logs`
--

INSERT INTO `attendance_logs` (`id`, `employee_id`, `device_id`, `attendance_type`, `scan_timestamp`, `attendance_date`, `status`, `verification_method`, `scan_location`, `photo_url`, `notes`, `processed_by`, `created_at`) VALUES
(16, 6, 1, 'time_in', '2025-08-08 01:37:53', '2025-08-08', 'late', 'face_recognition', 'Employee Kiosk', NULL, NULL, NULL, '2025-08-08 01:37:53'),
(17, 6, 1, 'time_out', '2025-08-08 01:55:04', '2025-08-08', 'on_time', 'face_recognition', 'Employee Kiosk', NULL, NULL, NULL, '2025-08-08 01:55:04');

-- --------------------------------------------------------

--
-- Stand-in structure for view `daily_attendance_overview`
-- (See below for the actual view)
--
CREATE TABLE `daily_attendance_overview` (
`attendance_date` date
,`total_employees` bigint(21)
,`present_count` bigint(21)
,`late_count` bigint(21)
,`absent_count` bigint(21)
,`attendance_percentage` decimal(26,2)
);

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `id` int(11) NOT NULL,
  `organization_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `department_type` enum('operations','support','management','finance','technology','marketing','sales','hr','legal','admin','customer_service','security','maintenance') NOT NULL,
  `manager_id` int(11) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `budget_code` varchar(20) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `departments`
--

INSERT INTO `departments` (`id`, `organization_id`, `name`, `department_type`, `manager_id`, `location`, `budget_code`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(2, 1, 'EJN OFFICE', 'management', NULL, 'BASILAN', NULL, NULL, 0, '2025-08-05 02:03:30', '2025-08-06 03:06:41'),
(3, 1, 'Human Resources', 'hr', NULL, 'Main Building, 2nd Floor', NULL, NULL, 1, '2025-08-06 02:57:07', '2025-08-06 02:57:07'),
(4, 1, 'Information Technology', 'technology', NULL, 'Tech Center, 1st Floor', NULL, NULL, 1, '2025-08-06 02:57:07', '2025-08-06 02:57:07'),
(5, 1, 'Finance', 'finance', NULL, 'Admin Building, 3rd Floor', NULL, NULL, 0, '2025-08-06 02:57:07', '2025-08-08 04:52:15'),
(6, 1, 'Operations', 'operations', NULL, 'Operations Center', NULL, NULL, 1, '2025-08-06 02:57:07', '2025-08-06 02:57:07'),
(7, 1, 'Marketing', 'marketing', NULL, 'Marketing Hub, 4th Floor', NULL, NULL, 1, '2025-08-06 02:57:07', '2025-08-06 02:57:07');

-- --------------------------------------------------------

--
-- Table structure for table `dtr_summaries`
--

CREATE TABLE `dtr_summaries` (
  `id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `attendance_date` date NOT NULL,
  `time_in` time DEFAULT NULL,
  `time_out` time DEFAULT NULL,
  `break_out` time DEFAULT NULL,
  `break_in` time DEFAULT NULL,
  `total_work_hours` decimal(4,2) DEFAULT NULL,
  `regular_hours` decimal(4,2) DEFAULT NULL,
  `overtime_hours` decimal(4,2) DEFAULT NULL,
  `undertime_hours` decimal(4,2) DEFAULT NULL,
  `late_minutes` int(11) DEFAULT 0,
  `early_out_minutes` int(11) DEFAULT 0,
  `status` enum('present','absent','late','half_day','on_leave','holiday') NOT NULL,
  `leave_type` varchar(50) DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employees`
--

CREATE TABLE `employees` (
  `id` int(11) NOT NULL,
  `organization_id` int(11) NOT NULL DEFAULT 1,
  `employee_id` varchar(20) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `middle_name` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female') DEFAULT NULL,
  `employee_type` enum('regular','contractual','probationary','intern','consultant') NOT NULL,
  `position` varchar(100) DEFAULT NULL,
  `department_id` int(11) DEFAULT NULL,
  `work_schedule_id` int(11) DEFAULT NULL,
  `office_location` varchar(100) DEFAULT NULL,
  `employment_status` enum('active','inactive','on_leave','terminated','resigned') DEFAULT 'active',
  `date_hired` date DEFAULT NULL,
  `salary_grade` varchar(10) DEFAULT NULL,
  `immediate_supervisor` int(11) DEFAULT NULL,
  `photo_path` varchar(500) DEFAULT NULL,
  `work_schedule` enum('day_shift','night_shift','flexible','remote','hybrid') DEFAULT 'day_shift',
  `face_encoding` longtext DEFAULT NULL COMMENT 'Face recognition data',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employees`
--

INSERT INTO `employees` (`id`, `organization_id`, `employee_id`, `first_name`, `last_name`, `middle_name`, `email`, `phone`, `date_of_birth`, `gender`, `employee_type`, `position`, `department_id`, `work_schedule_id`, `office_location`, `employment_status`, `date_hired`, `salary_grade`, `immediate_supervisor`, `photo_path`, `work_schedule`, `face_encoding`, `is_active`, `created_at`, `updated_at`) VALUES
(6, 1, 'EMP20255260', 'Kaxandra', 'Dale', NULL, NULL, NULL, NULL, NULL, 'contractual', 'Freelancer', 3, 11, NULL, 'active', NULL, NULL, NULL, 'uploads/employee/employee_1754451466_6537.jpg', 'day_shift', NULL, 1, '2025-08-06 03:37:46', '2025-08-08 05:13:09');

-- --------------------------------------------------------

--
-- Table structure for table `face_recognition_data`
--

CREATE TABLE `face_recognition_data` (
  `id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `organization_id` int(11) NOT NULL,
  `face_descriptor` longtext NOT NULL COMMENT 'JSON encoded face descriptor array from face-api.js',
  `face_image_path` varchar(500) DEFAULT NULL COMMENT 'Path to the enrollment face image',
  `confidence_threshold` decimal(3,2) DEFAULT 0.60 COMMENT 'Minimum confidence for face matching',
  `enrollment_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_trained` timestamp NULL DEFAULT NULL COMMENT 'Last time face data was retrained',
  `training_images_count` int(11) DEFAULT 1 COMMENT 'Number of training images used',
  `is_active` tinyint(1) DEFAULT 1 COMMENT 'Whether face recognition is enabled for this employee',
  `quality_score` decimal(4,3) DEFAULT NULL COMMENT 'Quality score of the enrolled face image',
  `landmark_data` longtext DEFAULT NULL COMMENT 'Face landmark data for verification',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional metadata like lighting conditions, angle, etc.' CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Face recognition enrollment data for employees';

--
-- Dumping data for table `face_recognition_data`
--

INSERT INTO `face_recognition_data` (`id`, `employee_id`, `organization_id`, `face_descriptor`, `face_image_path`, `confidence_threshold`, `enrollment_date`, `last_trained`, `training_images_count`, `is_active`, `quality_score`, `landmark_data`, `metadata`, `created_at`, `updated_at`) VALUES
(1, 6, 1, '[-0.12371905148029327,0.03685618191957474,-0.017590351402759552,-0.0948120728135109,-0.07684174925088882,-0.11716583371162415,0.02925517037510872,-0.15884201228618622,0.20047877728939056,-0.12150733172893524,0.27929988503456116,-0.058710016310214996,-0.18492431938648224,-0.14596959948539734,0.03439638391137123,0.2104434072971344,-0.15583623945713043,-0.15862096846103668,-0.06804154813289642,0.015130819752812386,0.014274767599999905,-0.05299606919288635,0.024818668141961098,0.06857721507549286,-0.0811615139245987,-0.4287559390068054,-0.12154749035835266,-0.12405641376972198,-0.02570885792374611,-0.04809058830142021,0.02440500631928444,0.12870267033576965,-0.15640468895435333,-0.06094701215624809,0.019779976457357407,0.09843185544013977,-0.08613507449626923,-0.040879104286432266,0.22277948260307312,0.029065586626529694,-0.30011287331581116,-0.05696620047092438,-0.02411491796374321,0.2804473340511322,0.15488259494304657,0.005984557326883078,0.09440309554338455,-0.08772532641887665,0.07439613342285156,-0.15760532021522522,0.017975233495235443,0.09369508922100067,0.07959091663360596,0.016941668465733528,-0.0014353693695738912,-0.12732507288455963,0.02316214330494404,0.10538319498300552,-0.25323134660720825,0.002621164545416832,0.10485029220581055,-0.18884052336215973,-0.08057853579521179,-0.053680479526519775,0.2738806903362274,0.1450275331735611,-0.14768970012664795,-0.10944158583879471,0.22482551634311676,-0.12653133273124695,-0.027836458757519722,0.03830926492810249,-0.1706947684288025,-0.2432900369167328,-0.3200409710407257,0.023968270048499107,0.4092453420162201,0.07682518661022186,-0.15373563766479492,-0.030742503702640533,-0.06866233795881271,0.03246729448437691,0.10298164933919907,0.17603908479213715,-0.014363253489136696,0.007279766723513603,-0.10160312056541443,-0.018625110387802124,0.1639532446861267,-0.06737688928842545,-0.046546775847673416,0.18323299288749695,-0.06145550683140755,0.02938692457973957,-0.003979702480137348,0.045935630798339844,-0.05679800733923912,0.03916270285844803,-0.08843012899160385,-0.004187833052128553,0.0368681363761425,-0.08524874597787857,0.013019830919802189,0.10936132818460464,-0.13111041486263275,0.14749543368816376,0.008249690756201744,0.030132746323943138,-0.0024446931201964617,0.009453839622437954,-0.03604985028505325,-0.12952226400375366,0.09275351464748383,-0.19582617282867432,0.20423297584056854,0.20844964683055878,0.030565304681658745,0.18206672370433807,0.05059086158871651,0.09203283488750458,-0.053029417991638184,-0.06422813981771469,-0.23580867052078247,0.012781214900314808,0.07183440774679184,0.06706949323415756,0.07988487184047699,0.007361804600805044]', 'uploads/faces/face_6_1754457307.jpg', 0.60, '2025-08-06 05:15:07', NULL, 1, 1, 0.696, '[{\"_x\":368.5812589293346,\"_y\":265.96069899201393},{\"_x\":366.6765588335693,\"_y\":278.68745678663254},{\"_x\":365.6152500715107,\"_y\":291.79606610536575},{\"_x\":365.95865214429796,\"_y\":302.66850131750107},{\"_x\":366.74782376922667,\"_y\":313.67737621068954},{\"_x\":370.24629876669496,\"_y\":322.66075867414474},{\"_x\":375.77864187955856,\"_y\":329.41204911470413},{\"_x\":383.4891565591097,\"_y\":335.61773949861526},{\"_x\":396.6552734673023,\"_y\":341.6291414499283},{\"_x\":411.7184228003025,\"_y\":343.45224618911743},{\"_x\":424.6270936727524,\"_y\":342.61000990867615},{\"_x\":435.24224984645844,\"_y\":341.55701261758804},{\"_x\":445.5600009560585,\"_y\":336.0733678340912},{\"_x\":454.82796001434326,\"_y\":327.52062356472015},{\"_x\":460.7081301808357,\"_y\":317.1264628767967},{\"_x\":466.7321927547455,\"_y\":306.0182693004608},{\"_x\":470.954886674881,\"_y\":293.7595483660698},{\"_x\":376.58575516194105,\"_y\":250.49291755259037},{\"_x\":383.6434442996979,\"_y\":244.9311632514},{\"_x\":390.9034510552883,\"_y\":244.7743095457554},{\"_x\":397.76613292098045,\"_y\":247.17022582888603},{\"_x\":404.1859088242054,\"_y\":250.76574462652206},{\"_x\":430.3115006685257,\"_y\":256.6920538842678},{\"_x\":437.88242810964584,\"_y\":256.1242656111717},{\"_x\":446.7203675508499,\"_y\":257.36431393027306},{\"_x\":454.98457300662994,\"_y\":261.5904822051525},{\"_x\":459.9956423640251,\"_y\":271.4847715497017},{\"_x\":413.23794332146645,\"_y\":271.8601068854332},{\"_x\":410.2661857008934,\"_y\":279.97645404934883},{\"_x\":407.2192035019398,\"_y\":286.99965381622314},{\"_x\":404.3361246883869,\"_y\":294.5172220468521},{\"_x\":396.6095082163811,\"_y\":300.0577275156975},{\"_x\":399.8539418876171,\"_y\":302.42268919944763},{\"_x\":404.2151440680027,\"_y\":304.16214007139206},{\"_x\":409.5561873614788,\"_y\":304.67773032188416},{\"_x\":414.3365518450737,\"_y\":305.3641189932823},{\"_x\":383.7247544378042,\"_y\":264.9229806661606},{\"_x\":388.4118095636368,\"_y\":264.13539093732834},{\"_x\":395.22705629467964,\"_y\":265.83372527360916},{\"_x\":400.530987650156,\"_y\":270.12416473031044},{\"_x\":394.71731200814247,\"_y\":270.6623110175133},{\"_x\":387.7040044814348,\"_y\":268.8720901310444},{\"_x\":428.9478073120117,\"_y\":277.40425449609756},{\"_x\":435.967139005661,\"_y\":275.6491388082504},{\"_x\":442.6790770292282,\"_y\":277.25738963484764},{\"_x\":447.4054619073868,\"_y\":281.5344361066818},{\"_x\":441.39001274108887,\"_y\":282.6740298271179},{\"_x\":434.4445795416832,\"_y\":280.1826713979244},{\"_x\":385.2830076664686,\"_y\":314.93752843141556},{\"_x\":391.4368453770876,\"_y\":312.9490632414818},{\"_x\":398.41409385204315,\"_y\":312.70621532201767},{\"_x\":402.4661649465561,\"_y\":314.3487419486046},{\"_x\":406.31231236457825,\"_y\":314.39218801259995},{\"_x\":414.7292231619358,\"_y\":319.9380737543106},{\"_x\":421.65638893842697,\"_y\":325.31510835886},{\"_x\":412.6440817117691,\"_y\":326.88548451662064},{\"_x\":405.3572401702404,\"_y\":326.7626902461052},{\"_x\":398.92529928684235,\"_y\":325.67366099357605},{\"_x\":393.7745874375105,\"_y\":323.46177023649216},{\"_x\":388.57560858130455,\"_y\":320.4010873436928},{\"_x\":386.719239667058,\"_y\":315.4064271450043},{\"_x\":396.3311011493206,\"_y\":316.5428691506386},{\"_x\":401.53262320160866,\"_y\":318.2326282262802},{\"_x\":407.44044774770737,\"_y\":319.4978650212288},{\"_x\":419.3713464438915,\"_y\":324.5839393734932},{\"_x\":406.35945588350296,\"_y\":320.98870545625687},{\"_x\":400.6201729476452,\"_y\":319.7914216518402},{\"_x\":395.5875270962715,\"_y\":318.55119663476944}]', '{\"enrollment_timestamp\":1754457306183,\"face_box\":{\"_x\":368.7974166870117,\"_y\":221.8768310546875,\"_width\":103.80783081054688,\"_height\":121.65401458740232},\"quality_metrics\":{\"size_score\":0.2525727872742572,\"confidence_score\":0.8624941110610962,\"landmark_count\":68}}', '2025-08-06 05:15:07', '2025-08-06 05:15:07');

-- --------------------------------------------------------

--
-- Table structure for table `generated_reports`
--

CREATE TABLE `generated_reports` (
  `id` int(11) NOT NULL,
  `organization_id` int(11) NOT NULL,
  `report_name` varchar(255) NOT NULL,
  `report_type` enum('daily','weekly','monthly','payroll','custom','attendance','lateness','absentee','department','overtime') NOT NULL,
  `report_description` text DEFAULT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` bigint(20) DEFAULT NULL COMMENT 'File size in bytes',
  `file_format` enum('PDF','Excel','CSV') DEFAULT 'PDF',
  `status` enum('processing','completed','failed') DEFAULT 'processing',
  `parameters` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Report generation parameters' CHECK (json_valid(`parameters`)),
  `generated_by` int(11) NOT NULL,
  `generated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `download_count` int(11) DEFAULT 0,
  `last_downloaded_at` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `generated_reports`
--

INSERT INTO `generated_reports` (`id`, `organization_id`, `report_name`, `report_type`, `report_description`, `file_name`, `file_path`, `file_size`, `file_format`, `status`, `parameters`, `generated_by`, `generated_at`, `download_count`, `last_downloaded_at`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 'Monthly DTR Report', 'monthly', 'Generated report', 'monthly_dtr_202412.pdf', '/uploads/reports/monthly_dtr_202412.pdf', 5242880, 'PDF', 'completed', NULL, 1, '2025-01-08 02:06:00', 3, NULL, 1, '2025-08-06 02:08:48', '2025-08-06 02:08:48'),
(2, 1, 'Absentee Report', 'daily', 'Generated report', 'absentee_20250108.pdf', '/uploads/reports/absentee_20250108.pdf', 2097152, 'PDF', 'completed', NULL, 1, '2025-01-08 02:06:00', 1, NULL, 1, '2025-08-06 02:08:48', '2025-08-06 02:08:48'),
(3, 1, 'Daily Attendance - Dec 15, 2024', 'daily', 'Complete daily attendance summary', 'daily_attendance_20241215.pdf', '/uploads/reports/daily_attendance_20241215.pdf', 2516582, 'PDF', 'completed', NULL, 1, '2024-12-15 06:30:00', 2, NULL, 1, '2025-08-06 02:08:48', '2025-08-06 02:08:48');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `recipient_id` int(11) NOT NULL,
  `sender_id` int(11) DEFAULT NULL,
  `type` enum('sms','email','push','in_app') NOT NULL,
  `category` enum('attendance','tardiness','absence','overtime','system','payroll') DEFAULT 'attendance',
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `status` enum('pending','sent','delivered','failed','read') DEFAULT 'pending',
  `sent_at` timestamp NULL DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organizations`
--

CREATE TABLE `organizations` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(20) NOT NULL,
  `address` text DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `ceo_name` varchar(255) DEFAULT NULL,
  `business_permit_id` varchar(20) DEFAULT NULL COMMENT 'Business Permit ID',
  `organization_type` enum('corporation','partnership','sole_proprietorship','cooperative','non_profit') DEFAULT 'corporation',
  `region` varchar(50) DEFAULT NULL,
  `industry` varchar(100) DEFAULT NULL,
  `timezone` varchar(50) DEFAULT 'Asia/Manila',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `organizations`
--

INSERT INTO `organizations` (`id`, `name`, `code`, `address`, `phone`, `email`, `ceo_name`, `business_permit_id`, `organization_type`, `region`, `industry`, `timezone`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Business Corporation', 'BC001', '123 Business St', NULL, 'admin@business.com', NULL, NULL, 'corporation', NULL, NULL, 'Asia/Manila', 1, '2025-07-31 15:41:46', '2025-07-31 15:41:46'),
(2, 'Tech Solutions Inc.', 'TSI001', '123 Business Ave, Metro Manila', '+63-2-123-4567', 'info@techsolutions.com', 'John Smith', 'BP2024-001', 'corporation', 'NCR', 'Information Technology', 'Asia/Manila', 1, '2025-08-06 04:09:24', '2025-08-06 04:09:24');

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

CREATE TABLE `system_settings` (
  `id` int(11) NOT NULL,
  `organization_id` int(11) DEFAULT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `system_settings`
--

INSERT INTO `system_settings` (`id`, `organization_id`, `setting_key`, `setting_value`, `description`, `created_at`, `updated_at`) VALUES
(1, NULL, 'face_recognition_enabled', 'true', 'Enable face recognition system', '2025-08-06 00:27:14', '2025-08-06 00:27:14'),
(2, NULL, 'face_confidence_threshold', '0.6', 'Default confidence threshold for face recognition', '2025-08-06 00:27:14', '2025-08-06 00:27:14'),
(3, NULL, 'face_enrollment_quality_min', '0.7', 'Minimum quality score required for face enrollment', '2025-08-06 00:27:14', '2025-08-06 00:27:14'),
(4, NULL, 'face_max_training_images', '5', 'Maximum number of training images per employee', '2025-08-06 00:27:14', '2025-08-06 00:27:14'),
(5, NULL, 'qr_features_removed', 'true', 'QR code features have been removed from the system', '2025-08-06 00:31:35', '2025-08-06 00:31:35');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `organization_id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','hr_manager','department_head','supervisor','employee','security') NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female') DEFAULT NULL,
  `profile_image` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `organization_id`, `username`, `email`, `password_hash`, `role`, `first_name`, `last_name`, `middle_name`, `phone`, `date_of_birth`, `gender`, `profile_image`, `is_active`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 1, 'admin', 'admin@business.com', '$2y$10$xEU5CcPpyz0k2ud7fNa6A.laGLrCi8Q59./PqR03oDP558XDAgOkm', 'admin', 'System', 'Administrator', NULL, NULL, NULL, NULL, NULL, 1, NULL, '2025-07-31 15:41:46', '2025-08-06 02:52:32');

-- --------------------------------------------------------

--
-- Table structure for table `work_schedules`
--

CREATE TABLE `work_schedules` (
  `id` int(11) NOT NULL,
  `organization_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `schedule_type` enum('regular','flexible','shift','remote') NOT NULL,
  `time_in` time NOT NULL DEFAULT '08:00:00',
  `time_out` time NOT NULL DEFAULT '17:00:00',
  `lunch_break_start` time DEFAULT '12:00:00',
  `lunch_break_end` time DEFAULT '13:00:00',
  `total_work_hours` decimal(3,1) DEFAULT 8.0,
  `late_threshold_minutes` int(11) DEFAULT 15,
  `overtime_threshold_minutes` int(11) DEFAULT 30,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `am_in` time DEFAULT NULL,
  `am_out` time DEFAULT NULL,
  `pm_in` time DEFAULT NULL,
  `pm_out` time DEFAULT NULL,
  `ot_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `ot_in` time DEFAULT NULL,
  `ot_out` time DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `work_schedules`
--

INSERT INTO `work_schedules` (`id`, `organization_id`, `name`, `schedule_type`, `time_in`, `time_out`, `lunch_break_start`, `lunch_break_end`, `total_work_hours`, `late_threshold_minutes`, `overtime_threshold_minutes`, `is_active`, `created_at`, `am_in`, `am_out`, `pm_in`, `pm_out`, `ot_enabled`, `ot_in`, `ot_out`) VALUES
(10, 1, 'Standard 8–5 + OT 6–10pm', 'regular', '08:00:00', '17:00:00', '12:00:00', '13:00:00', 8.0, 15, 30, 1, '2025-08-08 02:30:34', '08:00:00', '12:00:00', '13:00:00', '17:00:00', 1, '18:00:00', '22:00:00'),
(11, 1, 'Shift B 9–6', 'regular', '08:00:00', '18:00:00', '12:00:00', '13:00:00', 8.0, 15, 30, 1, '2025-08-08 02:30:34', '08:00:00', '12:00:00', '13:00:00', '18:00:00', 0, NULL, NULL);

-- --------------------------------------------------------

--
-- Structure for view `daily_attendance_overview`
--
DROP TABLE IF EXISTS `daily_attendance_overview`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `daily_attendance_overview`  AS SELECT `dtr`.`attendance_date` AS `attendance_date`, count(distinct `dtr`.`employee_id`) AS `total_employees`, count(case when `dtr`.`status` in ('present','late') then 1 end) AS `present_count`, count(case when `dtr`.`status` = 'late' then 1 end) AS `late_count`, count(case when `dtr`.`status` = 'absent' then 1 end) AS `absent_count`, round(count(case when `dtr`.`status` in ('present','late') then 1 end) * 100.0 / count(distinct `dtr`.`employee_id`),2) AS `attendance_percentage` FROM `dtr_summaries` AS `dtr` GROUP BY `dtr`.`attendance_date` ORDER BY `dtr`.`attendance_date` DESC ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `attendance_devices`
--
ALTER TABLE `attendance_devices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `organization_id` (`organization_id`),
  ADD KEY `department_id` (`department_id`);

--
-- Indexes for table `attendance_logs`
--
ALTER TABLE `attendance_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `employee_id` (`employee_id`),
  ADD KEY `device_id` (`device_id`),
  ADD KEY `attendance_date` (`attendance_date`);

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `organization_id` (`organization_id`),
  ADD KEY `manager_id` (`manager_id`);

--
-- Indexes for table `dtr_summaries`
--
ALTER TABLE `dtr_summaries`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_employee_date` (`employee_id`,`attendance_date`),
  ADD KEY `attendance_date` (`attendance_date`),
  ADD KEY `approved_by` (`approved_by`);

--
-- Indexes for table `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `employee_id` (`employee_id`),
  ADD KEY `department_id` (`department_id`),
  ADD KEY `immediate_supervisor` (`immediate_supervisor`),
  ADD KEY `work_schedule_id` (`work_schedule_id`),
  ADD KEY `fk_employees_organization` (`organization_id`);

--
-- Indexes for table `face_recognition_data`
--
ALTER TABLE `face_recognition_data`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_employee_face` (`employee_id`,`organization_id`),
  ADD KEY `idx_employee_id` (`employee_id`),
  ADD KEY `idx_organization_id` (`organization_id`),
  ADD KEY `idx_active_faces` (`is_active`,`organization_id`),
  ADD KEY `idx_enrollment_date` (`enrollment_date`),
  ADD KEY `idx_face_quality` (`quality_score`),
  ADD KEY `idx_face_confidence` (`confidence_threshold`);

--
-- Indexes for table `generated_reports`
--
ALTER TABLE `generated_reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `organization_id` (`organization_id`),
  ADD KEY `generated_by` (`generated_by`),
  ADD KEY `report_type` (`report_type`),
  ADD KEY `status` (`status`),
  ADD KEY `generated_at` (`generated_at`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `recipient_id` (`recipient_id`),
  ADD KEY `sender_id` (`sender_id`);

--
-- Indexes for table `organizations`
--
ALTER TABLE `organizations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_org_setting` (`organization_id`,`setting_key`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `organization_id` (`organization_id`);

--
-- Indexes for table `work_schedules`
--
ALTER TABLE `work_schedules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `organization_id` (`organization_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `attendance_devices`
--
ALTER TABLE `attendance_devices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `attendance_logs`
--
ALTER TABLE `attendance_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `dtr_summaries`
--
ALTER TABLE `dtr_summaries`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employees`
--
ALTER TABLE `employees`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `face_recognition_data`
--
ALTER TABLE `face_recognition_data`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `generated_reports`
--
ALTER TABLE `generated_reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organizations`
--
ALTER TABLE `organizations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `work_schedules`
--
ALTER TABLE `work_schedules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `attendance_devices`
--
ALTER TABLE `attendance_devices`
  ADD CONSTRAINT `attendance_devices_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `attendance_devices_ibfk_2` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `attendance_logs`
--
ALTER TABLE `attendance_logs`
  ADD CONSTRAINT `attendance_logs_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `attendance_logs_ibfk_2` FOREIGN KEY (`device_id`) REFERENCES `attendance_devices` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `departments`
--
ALTER TABLE `departments`
  ADD CONSTRAINT `departments_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `departments_ibfk_2` FOREIGN KEY (`manager_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `dtr_summaries`
--
ALTER TABLE `dtr_summaries`
  ADD CONSTRAINT `dtr_summaries_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `dtr_summaries_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `employees`
--
ALTER TABLE `employees`
  ADD CONSTRAINT `employees_ibfk_2` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `employees_ibfk_3` FOREIGN KEY (`immediate_supervisor`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `employees_supervisor_fk` FOREIGN KEY (`immediate_supervisor`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `employees_work_schedule_fk` FOREIGN KEY (`work_schedule_id`) REFERENCES `work_schedules` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_employees_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`);

--
-- Constraints for table `face_recognition_data`
--
ALTER TABLE `face_recognition_data`
  ADD CONSTRAINT `fk_face_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_face_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `generated_reports`
--
ALTER TABLE `generated_reports`
  ADD CONSTRAINT `generated_reports_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `generated_reports_ibfk_2` FOREIGN KEY (`generated_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD CONSTRAINT `system_settings_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `work_schedules`
--
ALTER TABLE `work_schedules`
  ADD CONSTRAINT `work_schedules_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
