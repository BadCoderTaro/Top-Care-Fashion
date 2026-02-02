export type StyleOption = {
  name: string;
  image: string;
};

export const STYLE_OPTIONS: StyleOption[] = [
  {
    name: "Streetwear",
    image:
      "https://tse1.mm.bing.net/th/id/OIP.VzaAIQ7keKtETkQY3XiR7QHaLG?cb=12&rs=1&pid=ImgDetMain&o=7&rm=3",
  },
  {
    name: "90s/Y2K",
    image:
      "https://image-cdn.hypb.st/https://hypebeast.com/image/2023/05/diesel-resort-2024-collection-008.jpg?q=75&w=800&cbr=1&fit=max",
  },
  {
    name: "Vintage",
    image:
      "https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/291781/vintage-inspired-fashion-brands-291781-1614100119475-image-768-80.jpg",
  },
  {
    name: "Sportswear",
    image:
      "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/734a943f-8d74-4841-be22-e6076816ea44/sportswear-tech-fleece-windrunner-mens-full-zip-hoodie-rznlBf.png",
  },
  {
    name: "Independent Brands",
    image:
      "https://tse3.mm.bing.net/th/id/OIP.zfm0Md_lr-4tMhh7v1W6vAHaKC?cb=12&w=756&h=1024&rs=1&pid=ImgDetMain&o=7&rm=3",
  },
  {
    name: "Luxury Designer",
    image:
      "https://assets.vogue.com/photos/633c1b5fd3985aae1bd1bd97/master/w_2560%2Cc_limit/00004-chanel-spring-2023-ready-to-wear-credit-gorunway.jpg",
  },
];

export const DEFAULT_STYLE_IMAGE =
  "https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?q=80&w=600&auto=format&fit=crop";
