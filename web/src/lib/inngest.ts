import { Inngest } from "inngest";

export const inngest = new Inngest({ 
  id: "toilet-tails",
  name: "Toilet Tails AI Pipeline"
});

// Define event types
export type Events = {
  "render/start": {
    data: {
      uploadId: string;
      scene: string;
      petKey: string;
      bgKey?: string;
    };
  };
};
