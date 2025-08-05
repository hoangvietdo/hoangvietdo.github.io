---
title: "Radar Velocity Measurements Aided Navigation System for UAVs"
date: 2021-10-12
publishDate: 2021-10-12
authors: ["Yeong Seo Kwon", "Yong Hun Kim", "***Hoang Viet Do***", "San Hee Kang", "Hak Ju Kim", "Jin Woo Song"]
author_notes: ["", "", "", "", "", "Corresponding author"]
publication_types: ["1"]
show_date: false
reading_time: true
pager: true

featured: true
publication: "2021 21st International Conference on Control, Automation and Systems (ICCAS), Jeju, Korea, Republic of, 2021, pp. 472-476"
links:
  - icon_pack: fas
    icon: scroll
    name: PDF
    url: 'https://ieeexplore.ieee.org/abstract/document/9649866'

image:
    placement: 1
    focal_point: 'Center'
    preview_only: false
    caption: ""
---

### Abstract:

In this paper, we propose a radar/inertial navigation system (RINS) integrated system for solving the problem of global navigation satellite system (GNSS)-outage. Due to the relatively compact size and low power consumption with reliable measurement, radar can be one of the alternative solutions for the weakness of GNSS. Radar transmits signals to the ground and obtains information such as the target's range, velocity, azimuth, and elevation angle from the reflected echo signal. However, the velocity of multiple targets may include incorrect information from multi-paths or ghost targets. Therefore, outlier mitigation method is required to improve the quality of the velocity measurements from the radar. Calculated velocity then can be used for an extended Kalman filter (EKF) to correct the estimation errors. We also propose an adaptation algorithm, where measurement covariance is updated per time step, based on the standard deviation of the resulted velocity from the eliminated outliers. Simulations were performed using virtual UAV simulator data, and performance is verified compared to EKF. The simulation results confirm that the radar/INS integration system gives high accuracy and robust estimation, and it can be implemented in real-time applications.
{style="font-size: 0.95rem; text-align: justify;"}
