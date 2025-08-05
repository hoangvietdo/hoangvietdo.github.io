---
title: Drone VINS Simulator
subtitle: 'Drone Visual-Inertial Navigation System Simulator'
date: 2021-10-15
publishDate: 2021-10-15
show_date: false
reading_time: true
pager: true

summary: ICCAS 2021, Visual-Inertial Navigation System, Monocular Pinhole Camera, MATLAB, Simulator

# # Optional external URL for project (replaces project detail page).
# external_link: https://example.org

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
  # caption: Photo by Toa Heftiba on Unsplash
  preview_only: true
  placement: 1
  focal_point: center
---

This is a drone simulation written in Matlab. The simulation employs a PID controller to guide a quadcopter along a given smooth trajectory and generate ground truth, IMU data, and monocular camera images using a pinhole model. For instance, we simulate the drone flying in a circular pattern assuming that the camera is oriented downward, capturing randomly generated ground features. The resulting dataset can be utilized to evaluate the performance of a visual-inertial navigation system (VINS).
{style="font-size: 0.95rem; text-align: justify;"}

<img src="/images/drone_vins.gif" align="center"/>
<img src="/images/ekf_vins.png" align="center"/>