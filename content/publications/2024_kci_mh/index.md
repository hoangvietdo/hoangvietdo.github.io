---
title: "Radar Dead-reckoning Based EKF-SLAM Using Virtual Line Segment"
date: 2024-09-01
publishDate: 2024-09-01
authors: ["Min Ho Lee", "Kyeong Wook Seo", "Dong Yun Hwang", "Jin Woo Song", "***Hoang Viet Do***"]
author_notes: ["", "", "", "", "Corresponding author"]
publication_types: ["2"]
show_date: false
reading_time: true
pager: true

featured: true
publication: "Journal of Institute of Control, Robotics and Systems (2024) 30(9):996-1003 (in Korean)"
links:
  - icon_pack: fas
    icon: scroll
    name: PDF
    url: 'https://www.dbpia.co.kr/journal/articleDetail?nodeId=NODE11918069&language=ko_KR&hasTopBanner=true'

image:
    placement: 1
    focal_point: 'Center'
    preview_only: false
    caption: ""
---

### Abstract:

In this paper, we propose a dead reckoning–based radar simultaneous localization and mapping (SLAM) system utilizing constrained virtual line segments. In particular, we utilize Doppler velocity from radar for odometry while constructing a map using 3D radar point-cloud measurements. Unlike the conventional approach where accelerometers are employed, our system integrates radar velocity for pose calculation, thereby preventing double-integration and accelerometer bias and potentially improving the localization accuracy. Additionally, we analyze radar 3D point cloud characteristics and employ a recursive random sample consensus algorithm to eliminate outliers. The resulting set of inlier point clouds is then used to predict virtual line segments. Using virtual lines instead of feature points mitigates the sparse and noisy nature of radar point clouds. Moreover, considering the typical characteristics of indoor environments where walls intersect perpendicularly, we impose constraints on estimates to enhance performance further. We evaluate the performance of the proposed algorithm through experiments conducted in real indoor environments using an unmanned ground vehicle platform. Our results demonstrate significant improvements over traditional odometer-based systems, with reductions of approximately 41% in 2D trajectory error and 49.5% in heading angle error.
{style="font-size: 0.95rem; text-align: justify;"}
