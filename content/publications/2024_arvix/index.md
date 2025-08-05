---
title: "CREVE: An Acceleration-based Constraint Approach for Robust Radar Ego-Velocity Estimation"
date: 2024-09-25
publishDate: 2024-09-25
authors: ["***Hoang Viet Do***", "Bo Sung Ko", "Yong Hun Kim", "Jin Woo Song"]
author_notes: ["", "", "", "Corresponding author"]
publication_types: ["1"]
show_date: false
reading_time: true
pager: true

featured: true
publication: "arXiv"
links:
  - icon_pack: fas
    icon: scroll
    name: arXiv
    url: 'https://arxiv.org/abs/2409.16847'

image:
    placement: 1
    focal_point: 'Center'
    preview_only: false
    caption: ""
---

<img src="/images/papers/2024_arvix.png" align="center"/>


### Abstract:

Ego-velocity estimation from point cloud measurements of a millimeter-wave frequency-modulated continuous wave (mmWave FMCW) radar has become a crucial component of radar-inertial odometry (RIO) systems. Conventional approaches often exhibit poor performance when the number of outliers in the point cloud exceeds that of inliers, which can lead to degraded navigation performance, especially in RIO systems that rely on radar ego-velocity for dead reckoning. In this paper, we propose CREVE, an acceleration-based inequality constraints filter that leverages additional measurements from an inertial measurement unit (IMU) to achieve robust ego-velocity estimations. To further enhance accuracy and robustness against sensor errors, we introduce a practical accelerometer bias estimation method and a parameter adaptation rule that dynamically adjusts constraints based on radar point cloud inliers. Experimental results on two open-source IRS and ColoRadar datasets demonstrate that the proposed method significantly outperforms three state-of-the-art approaches, reducing absolute trajectory error by approximately 36\%, 78\%, and 12\%, respectively.
{style="font-size: 0.95rem; text-align: justify;"}
