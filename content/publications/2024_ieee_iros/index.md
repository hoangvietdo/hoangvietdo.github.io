---
title: "DeRO: Dead Reckoning Based on Radar Odometry With Accelerometers Aided for Robot Localization"
date: 2024-10-14
publishDate: 2024-10-14
authors: ["***Hoang Viet Do***", "Yong Hun Kim", "Joo Han Lee", "Min Ho Lee", "Jin Woo Song"]
author_notes: ["", "", "", "", "Corresponding author"]
publication_types: ["1"]
show_date: false
reading_time: true
pager: true

featured: true
publication: "2024 IEEE/RSJ International Conference on Intelligent Robots and Systems (IROS), Abu Dhabi, United Arab Emirates, 2024, pp. 8547-8554 (Oral Presentation)"
links:
  - icon_pack: fas
    icon: scroll
    name: PDF
    url: 'https://ieeexplore.ieee.org/abstract/document/10801645'
  - icon_pack: fas
    icon: scroll
    name: arXiv
    url: 'https://arxiv.org/abs/2403.05136'
  - icon_pack: fab
    icon: github
    name: Code
    url: 'https://github.com/hoangvietdo/dero'

image:
    placement: 1
    focal_point: 'Center'
    preview_only: false
    caption: ""
---

<img src="/images/papers/2024_ieee_iros.png" align="center"/>

### Abstract:

In this paper, we propose a radar odometry structure that directly utilizes radar velocity measurements for dead reckoning while maintaining its ability to update estimations within the Kalman filter framework. Specifically, we employ the Doppler velocity obtained by a 4D Frequency Modulated Continuous Wave (FMCW) radar in conjunction with gyroscope data to calculate poses. This approach helps mitigate high drift resulting from accelerometer biases and double integration. Instead, tilt angles measured by gravitational force are utilized alongside relative distance measurements from radar scan matching for the filter’s measurement update. Additionally, to further enhance the system’s accuracy, we estimate and compensate for the radar velocity scale factor. The performance of the proposed method is verified through five real-world open-source datasets. The results demonstrate that our approach reduces position error by 62% and rotation error by 66% on average compared to the state-of-the-art radar-inertial fusion method in terms of absolute trajectory error.
{style="font-size: 0.95rem; text-align: justify;"}
