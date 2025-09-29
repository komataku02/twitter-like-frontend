import cross   from '../assets/img/cross.png'
import detail  from '../assets/img/detail.png'
import feather from '../assets/img/feather.png'
import heart   from '../assets/img/heart.png'
import home    from '../assets/img/home.png'
import logo    from '../assets/img/logo.png'
import logout  from '../assets/img/logout.png'
import profile from '../assets/img/profile.png'

type AppIcons = {
  cross:string; detail:string; feather:string; heart:string;
  home:string; logo:string; logout:string; profile:string;
}

const appIcons: AppIcons = { cross, detail, feather, heart, home, logo, logout, profile }

// どこでも同じ参照を返す簡単なフック
export const useAppIcons = (): AppIcons => appIcons
