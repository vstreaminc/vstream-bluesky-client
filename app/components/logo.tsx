import { useIntl } from "react-intl";
import { cn } from "~/lib/utils";

type Props = {
  className?: string;
};

/**
 * The VStrean "mark" (aka just the symbol)
 */
export function Mark(props: Props) {
  const title = useIntl().formatMessage({
    defaultMessage: "VStream Mark",
    description: "SVG title for the VStream Mark",
  });

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="400px"
      height="343px"
      viewBox="0 0 400 343"
      version="1.1"
      className={cn("[&_path]:fill-black dark:[&_path]:fill-white", props.className)}
      role="img"
    >
      <title>{title}</title>
      <g id="surface1">
        <path d="M 268.5625 11.792969 L 29.191406 11.792969 C 18.179688 11.792969 11.308594 23.734375 16.839844 33.261719 L 58.9375 105.792969 Z M 268.5625 11.792969 " />
        <path d="M 63.292969 113.359375 L 183.078125 319.773438 C 188.585938 329.265625 202.289062 329.261719 207.792969 319.765625 L 250 246.960938 Z M 63.292969 113.359375 " />
        <path d="M 277.28125 11.792969 L 254.363281 239.398438 L 374.046875 33.261719 C 379.578125 23.734375 372.707031 11.792969 361.691406 11.792969 Z M 277.28125 11.792969 " />
      </g>
    </svg>
  );
}

/**
 * The VStrean "logo" (aka the symbol + word)
 */
export function Logo(props: Props) {
  const title = useIntl().formatMessage({
    defaultMessage: "VStream Logo",
    description: "SVG title for the VStream logo",
  });
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="127"
      height="24"
      viewBox="0 0 127 24"
      fill="none"
      className={cn("[&_path]:fill-black dark:[&_path]:fill-white", props.className)}
      role="img"
    >
      <title>{title}</title>
      <path d="M43.4437 21.4367L34.6942 3.25373H38.6776L43.5376 13.9642L48.4914 3.25373H52.334L43.4437 21.4367Z" />
      <path d="M55.4409 7.89286C55.4409 8.7413 55.9887 9.26281 56.9122 9.72984L60.3713 11.4968C62.4139 12.5086 63.4547 13.7618 63.4547 15.7389C63.4547 19.0626 60.8252 21.1642 57.147 21.1642C55.1513 21.1642 53.2105 20.6894 51.6218 19.5141V15.5288C53.5392 17.319 55.6053 18.1441 57.1939 18.1441C58.5478 18.1441 59.7295 17.5759 59.7295 16.3772C59.7295 15.4587 59.3539 15.0306 58.0704 14.369L54.9166 12.7655C52.9757 11.8237 51.7862 10.5238 51.7862 8.18865C51.7862 4.98173 54.3922 2.99686 57.8122 2.99686C59.4948 2.99686 61.1069 3.32378 62.5078 4.20335V7.97849C60.9426 6.7253 59.3774 5.97027 57.8591 5.97027C56.5365 5.98584 55.4409 6.62411 55.4409 7.89286Z" />
      <path d="M69.2225 21.1798C66.3738 21.1798 64.6443 19.8565 64.6443 16.3928V5.61222H67.939V9.05265H72.1807V11.8859H67.939V16.3461C67.939 17.6459 68.7686 18.183 69.8094 18.183C70.7329 18.183 71.5155 17.9262 72.2511 17.4747V20.3781C71.4294 20.9385 70.3807 21.1798 69.2225 21.1798Z" />
      <path d="M76.861 20.9385H73.5585V9.05265H76.8532V11.0609C77.8236 9.62087 79.201 8.81914 80.9305 8.81914V12.4775C78.7706 11.9794 76.8532 13.1625 76.8532 15.6611V20.9385H76.861Z" />
      <path d="M92.9978 16.1281H84.7179C85.1718 17.5448 86.4239 18.3698 88.13 18.3698C89.5074 18.3698 90.83 17.9962 92.0665 17.2879V20.0978C90.7595 20.8529 89.343 21.1798 87.8483 21.1798C84.0762 21.1798 81.1805 18.8914 81.1805 15.1396C81.1805 11.5045 83.5988 8.81914 87.2535 8.81914C90.6891 8.81914 93.0604 11.271 93.0604 14.6725C93.0682 15.1629 93.0447 15.6299 92.9978 16.1281ZM84.6709 13.8163H89.6717C89.4839 12.4931 88.6544 11.5045 87.2535 11.5045C85.837 11.5045 84.984 12.4931 84.6709 13.8163Z" />
      <path d="M103.172 19.623C102.319 20.5882 101.106 21.1798 99.689 21.1798C96.2065 21.1798 93.71 18.5878 93.71 15.0695C93.71 11.4578 96.1751 8.81914 99.689 8.81914C101.113 8.81914 102.319 9.43405 103.172 10.4226V9.05265H106.466V20.9385H103.172V19.623ZM97.0751 15.0462C97.0751 16.8364 98.3586 18.1363 100.088 18.1363C101.865 18.1363 103.172 16.8364 103.172 15.0462C103.172 13.2092 101.865 11.8626 100.088 11.8626C98.3586 11.8626 97.0751 13.2014 97.0751 15.0462Z" />
      <path d="M111.302 20.9385H108.008V9.05265H111.302V10.2825C112.109 9.38735 113.22 8.81914 114.597 8.81914C116.092 8.81914 117.25 9.50411 117.962 10.6094C118.862 9.50411 120.193 8.81914 121.875 8.81914C124.63 8.81914 126.313 10.9208 126.313 13.6062V20.9385H123.018V14.3612C123.018 12.8745 122.447 11.956 121.101 11.956C119.653 11.956 118.8 13.3259 118.8 14.9528V20.9463H115.505V14.369C115.505 12.8823 114.957 11.9638 113.588 11.9638C112.163 11.9638 111.31 13.3337 111.31 14.9605V20.9385H111.302Z" />
      <path d="M18.7993 0.825188H2.04352C1.27262 0.825188 0.791632 1.66066 1.17873 2.32732L4.1256 7.40249L18.7993 0.825188Z" />
      <path d="M4.43054 7.93178L12.8156 22.3748C13.2011 23.0389 14.1602 23.0386 14.5455 22.3744L17.4999 17.2801L4.43054 7.93178Z" />
      <path d="M19.4097 0.825188L17.8054 16.7508L26.1832 2.32745C26.5704 1.66079 26.0894 0.825188 25.3184 0.825188H19.4097Z" />
    </svg>
  );
}
