---
title: "An Adaptive Approach based on Multi-State Constraint Kalman Filter for UAVs"
date: 2021-10-12
publishDate: 2021-10-12
authors: ["***Hoang Viet Do***", "Yong Hun Kim", "Yeong Seo Kwon", "San Hee Kang", "Hak Ju Kim", "Jin Woo Song"]
author_notes: ["", "", "", "", "", "Corresponding author"]
publication_types: ["1"]
show_date: false
reading_time: true
pager: true

featured: true
publication: "2021 21st International Conference on Control, Automation and Systems (ICCAS), Jeju, Korea, Republic of, 2021, pp. 481-485"
links:
  - icon_pack: fas
    icon: scroll
    name: PDF
    url: 'https://ieeexplore.ieee.org/abstract/document/9649897'
  - icon_pack: fab
    icon: github
    name: Code
    url: 'https://github.com/hoangvietdo/drone_vins_sim'

image:
    placement: 1
    focal_point: 'Center'
    preview_only: false
    caption: ""
---

### Abstract:

High accurate and robust motion estimation plays a fundamental role in the autonomous navigation system, especially for Visual Inertial Navigation System (VINS). The consistent of extended Kalman Filter (EKF)-based estimator highly relies on the prior information of the process noise (Q) and the measurement noise (R) covariance matrices. In this paper, we apply an adaptation rule to the well-known Multi-State Constraint Kalman Filter (MSCKF) using innovation and residual information for a monocular VINS that is mounted in a drone. The shortcoming of MSCKF is that the state vector grows as the number of detected features increasing. Since the vision process can give different estimated results due to various error sources such as the ambiguity or the quality of the camera, each epoch should have different weighting factors. Therefore, Q and R covariance matrices should be adapted. It is shown through the simulation that the proposed algorithm has more robustness and accuracy against the conventional approach which has fixed values of Q and R covariance matrices.
{style="font-size: 0.95rem; text-align: justify;"}
