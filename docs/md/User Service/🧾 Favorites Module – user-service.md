# **🧾 Favorites Module -- user-service**

> Allows users to bookmark marketplace listings (of any type) to their
> personal favorites list.

## **📁 File Structure**

****apps/user-service/

├── src/

│ ├── modules/

│ │ └── favorites/

│ │ ├── controllers/

│ │ │ └── favorites.controller.ts

│ │ ├── services/

│ │ │ └── favorites.service.ts

│ │ ├── dto/

│ │ │ ├── add-favorite.dto.ts

│ │ │ └── remove-favorite.dto.ts

│ │ ├── entities/

│ │ │ └── favorite.entity.ts

│ │ └── favorites.module.ts



## **🧱 Entity: favorite.entity.ts**

****import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn }
from \'typeorm\';

\@Entity(\'favorites\')

export class Favorite {

\@PrimaryGeneratedColumn(\'uuid\')

id: string;

\@Column()

userId: string;

\@Column()

listingId: string;

\@Column()

listingType: \'project\' \| \'service\' \| \'job\' \| \'team\';

\@CreateDateColumn()

createdAt: Date;

}



## **📥 DTOs**

### **add-favorite.dto.ts**

****import { IsString, IsIn } from \'class-validator\';

export class AddFavoriteDto {

\@IsString()

listingId: string;

\@IsIn(\[\'project\', \'service\', \'job\', \'team\'\])

listingType: \'project\' \| \'service\' \| \'job\' \| \'team\';

}

### **remove-favorite.dto.ts**

****import { IsString } from \'class-validator\';

export class RemoveFavoriteDto {

\@IsString()

listingId: string;

}



## **⚙️ Service: favorites.service.ts**

****\@Injectable()

export class FavoritesService {

constructor(

\@InjectRepository(Favorite)

private repo: Repository\<Favorite\>,

) {}

async add(userId: string, dto: AddFavoriteDto) {

const exists = await this.repo.findOne({ where: { userId, listingId:
dto.listingId } });

if (exists) return exists;

const fav = this.repo.create({ \...dto, userId });

return this.repo.save(fav);

}

async remove(userId: string, listingId: string) {

return this.repo.delete({ userId, listingId });

}

async getAll(userId: string) {

return this.repo.find({ where: { userId }, order: { createdAt: \'DESC\'
} });

}

}



## **📡 Controller: favorites.controller.ts**

****\@UseGuards(AuthGuard)

\@Controller(\'favorites\')

export class FavoritesController {

constructor(private readonly service: FavoritesService) {}

\@Post()

add(@Req() req, \@Body() dto: AddFavoriteDto) {

return this.service.add(req.user.id, dto);

}

\@Delete()

remove(@Req() req, \@Body() dto: RemoveFavoriteDto) {

return this.service.remove(req.user.id, dto.listingId);

}

\@Get()

getAll(@Req() req) {

return this.service.getAll(req.user.id);

}

}



## **🔗 API Endpoints**

  ----------------------------------------------------
  **Method**   **Endpoint**   **Description**
  ------------ -------------- ------------------------
  POST         /favorites     Add listing to favorites

  DELETE       /favorites     Remove listing from
                              favorites

  GET          /favorites     Get current user\'s
                              favorites list
  ----------------------------------------------------

## **💡 Notes**

- You can display these in the frontend under "My Favorites" sorted by
  createdAt.

- Each favorite stores the listingId and listingType, so the frontend
  can route users to the correct view.

- You can easily add pagination if needed.
