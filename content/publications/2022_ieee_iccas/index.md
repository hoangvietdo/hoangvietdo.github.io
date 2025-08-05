---
title: "An Improvement of 3D DR/INS/GNSS Integrated System using Inequality Constrained EKF"
date: 2022-11-27
publishDate: 2022-11-27
authors: ["***Hoang Viet Do***", "Yeong Seo Kwon", "Hak Ju Kim", "Jin Woo Song"]
author_notes: ["", "", "", "Corresponding author"]
publication_types: ["1"]
show_date: false
reading_time: true
pager: true

featured: true
publication: "2022 22nd International Conference on Control, Automation and Systems (ICCAS), Jeju, Korea, Republic of, 2022, pp. 1780-1783"

links:
  - icon_pack: fas
    icon: scroll
    name: PDF
    url: 'https://ieeexplore.ieee.org/abstract/document/10003721'

image:
    placement: 1
    focal_point: 'Center'
    preview_only: false
    caption: ""
---

### Abstract:

It is well known that INS/GNSS integrated system is either unavailable or unreliable in high-rise buildings environment. This study proposes a novel framework to fuse Odometer, INS, and GNSS to provide robust pose estimation for the mentioned challenge. Motivated by the disadvantage of the recent development of 3DDR/GNSS, we relax its assumption where velocities and accelerometer biases are estimated without sensor pre-calibration. In particular, the traditional INS/GNSS and DR/GNSS are augmented into a single system without conflict to perform EKF. Moreover, inequalities-constrained EKF is derived based on the characteristic of the presented system to increase the robustness. This constraint exploits an empirical observable where the position estimation of the odometer is considered more accurate than INS since it only requires one-step integration. The proposed approach is validated through an author-designed Unreal Engine challenging map with the AirSim plugin of an autonomous ground vehicle. The results show a significant accuracy improvement in which the position and velocity error have been reduced respectively 68% and 39% on average over a 0.81km driving.
{style="font-size: 0.95rem; text-align: justify;"}
